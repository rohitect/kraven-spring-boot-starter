import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActuatorDataService } from '../services/actuator-data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-threads-tab',
  templateUrl: './threads-tab.component.html',
  styleUrls: ['./threads-tab.component.scss', './thread-analysis.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class ThreadsTabComponent implements OnInit, OnDestroy {
  threadDumpData: any = null;
  isLoading = true;
  // No longer using refresh interval
  searchTerm = '';
  filteredThreads: any[] = [];

  // Thread state filters
  showRunnable = true;
  showBlocked = true;
  showWaiting = true;
  showTimedWaiting = true;
  showTerminated = true;

  // Secondary tabs
  activeSecondaryTab: 'overview' | 'details' | 'state' | 'stacktrace' | 'analysis' = 'overview';

  // Selected thread for details view
  selectedThread: any = null;

  // Thread state counts
  threadStateCounts: { [key: string]: number } = {};

  // Common thread pools
  commonThreadPools: { [key: string]: any } = {
    'hikari': {
      count: 0,
      states: {},
      patterns: ['HikariCP', 'connection pool', 'hikari']
    },
    'kafka': {
      count: 0,
      states: {},
      patterns: ['kafka', 'KafkaConsumer', 'KafkaProducer', 'ConsumerFetcherThread']
    },
    'spring': {
      count: 0,
      states: {},
      patterns: ['SpringApplicationShutdownHook', 'TaskScheduler', 'SimpleAsyncTaskExecutor', 'ThreadPoolTaskExecutor']
    },
    'web-container': {
      count: 0,
      states: {},
      patterns: ['tomcat', 'catalina', 'jetty', 'undertow', 'http-nio', 'http-exec']
    },
    'redis': {
      count: 0,
      states: {},
      patterns: ['redis', 'lettuce', 'redisson']
    },
    'temporal': {
      count: 0,
      states: {},
      patterns: ['temporal', 'workflow-worker', 'activity-worker']
    },
    'jvm': {
      count: 0,
      states: {},
      patterns: ['GC task thread', 'Finalizer', 'Reference Handler', 'Signal Dispatcher', 'Attach Listener', 'Service Thread', 'C1 CompilerThread', 'C2 CompilerThread', 'VM Thread']
    }
  };

  // Analysis tab
  analysisTypes: any[] = [];
  selectedAnalysisType: string = '';
  analysisResults: any = null;
  isAnalyzing: boolean = false;
  expandedSections: boolean[] = [];

  private dataSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  private analysisTypesSubscription?: Subscription;
  private analysisSubscription?: Subscription;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadThreadDumpData();

    // Load analysis types
    this.loadAnalysisTypes();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.analysisTypesSubscription) {
      this.analysisTypesSubscription.unsubscribe();
    }
    if (this.analysisSubscription) {
      this.analysisSubscription.unsubscribe();
    }
  }

  /**
   * Load thread dump data from the service
   */
  loadThreadDumpData(): void {
    this.isLoading = true;
    this.dataSubscription = this.actuatorDataService.getThreadDumpData().subscribe({
      next: (data) => {
        this.threadDumpData = data;
        this.processThreadData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading thread dump data:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Process thread data to extract useful information
   */
  processThreadData(): void {
    if (!this.threadDumpData || !this.threadDumpData.threads) {
      this.filteredThreads = [];
      this.threadStateCounts = {};
      return;
    }

    // Reset thread state counts
    this.threadStateCounts = {
      'RUNNABLE': 0,
      'BLOCKED': 0,
      'WAITING': 0,
      'TIMED_WAITING': 0,
      'TERMINATED': 0,
      'NEW': 0
    };

    // Reset common thread pools
    Object.keys(this.commonThreadPools).forEach(key => {
      this.commonThreadPools[key].count = 0;
      this.commonThreadPools[key].states = {};
    });

    // Count thread states and identify common thread pools
    this.threadDumpData.threads.forEach((thread: any) => {
      // Count thread states
      if (this.threadStateCounts[thread.threadState]) {
        this.threadStateCounts[thread.threadState]++;
      } else {
        this.threadStateCounts[thread.threadState] = 1;
      }

      // Identify thread pools
      this.categorizeThreadToPool(thread);
    });

    // Apply filters
    this.applyFilters();
  }

  /**
   * Categorize a thread to a specific pool
   */
  private categorizeThreadToPool(thread: any): void {
    const threadName = thread.threadName.toLowerCase();
    const threadState = thread.threadState;

    // Check each pool's patterns
    for (const poolKey of Object.keys(this.commonThreadPools)) {
      const pool = this.commonThreadPools[poolKey];

      // Check if thread name matches any pattern for this pool
      const isMatch = pool.patterns.some((pattern: string) =>
        threadName.includes(pattern.toLowerCase())
      );

      if (isMatch) {
        // Increment count
        pool.count++;

        // Update state distribution
        if (pool.states[threadState]) {
          pool.states[threadState]++;
        } else {
          pool.states[threadState] = 1;
        }

        // We found a match, no need to check other pools
        // Note: In a real app, you might want to allow a thread to belong to multiple pools
        // if that makes sense for your use case
        return;
      }
    }
  }

  /**
   * Check if any common thread pools were detected
   */
  hasCommonThreadPools(): boolean {
    return Object.values(this.commonThreadPools).some(pool => pool.count > 0);
  }

  /**
   * Get information about a specific thread pool
   */
  getThreadPoolInfo(poolKey: string): any {
    return this.commonThreadPools[poolKey] || { count: 0, states: {} };
  }

  /**
   * Filter threads by pool
   */
  filterThreadsByPool(poolKey: string): void {
    if (!this.threadDumpData || !this.threadDumpData.threads) {
      return;
    }

    const pool = this.commonThreadPools[poolKey];
    if (!pool || pool.count === 0) {
      return;
    }

    // Clear search term
    this.searchTerm = '';

    // Reset state filters to show all states
    this.showRunnable = true;
    this.showBlocked = true;
    this.showWaiting = true;
    this.showTimedWaiting = true;
    this.showTerminated = true;

    // Set search term to filter by pool patterns
    this.searchTerm = pool.patterns[0];

    // Apply filters
    this.applyFilters();
  }

  /**
   * Apply filters to thread data
   */
  applyFilters(): void {
    if (!this.threadDumpData || !this.threadDumpData.threads) {
      this.filteredThreads = [];
      return;
    }

    // Apply state filters
    let filtered = this.threadDumpData.threads.filter((thread: any) => {
      if (thread.threadState === 'RUNNABLE' && !this.showRunnable) return false;
      if (thread.threadState === 'BLOCKED' && !this.showBlocked) return false;
      if (thread.threadState === 'WAITING' && !this.showWaiting) return false;
      if (thread.threadState === 'TIMED_WAITING' && !this.showTimedWaiting) return false;
      if (thread.threadState === 'TERMINATED' && !this.showTerminated) return false;
      return true;
    });

    // Apply search filter if search term exists
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((thread: any) => {
        return (
          thread.threadName.toLowerCase().includes(term) ||
          thread.threadState.toLowerCase().includes(term) ||
          (thread.stackTrace && thread.stackTrace.some((frame: any) =>
            frame.className.toLowerCase().includes(term) ||
            frame.methodName.toLowerCase().includes(term)
          ))
        );
      });
    }

    this.filteredThreads = filtered;
  }

  /**
   * Take a thread dump
   */
  takeThreadDump(): void {
    this.loadThreadDumpData();
  }

  /**
   * Toggle a thread state filter
   */
  toggleStateFilter(state: string): void {
    switch (state) {
      case 'RUNNABLE':
        this.showRunnable = !this.showRunnable;
        break;
      case 'BLOCKED':
        this.showBlocked = !this.showBlocked;
        break;
      case 'WAITING':
        this.showWaiting = !this.showWaiting;
        break;
      case 'TIMED_WAITING':
        this.showTimedWaiting = !this.showTimedWaiting;
        break;
      case 'TERMINATED':
        this.showTerminated = !this.showTerminated;
        break;
    }
    this.applyFilters();
  }

  /**
   * Search threads
   */
  searchThreads(): void {
    this.applyFilters();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Select a thread for detailed view
   */
  selectThread(thread: any): void {
    this.selectedThread = thread;
    this.activeSecondaryTab = 'details';
  }

  /**
   * Switch to a different secondary tab
   */
  switchSecondaryTab(tab: 'overview' | 'details' | 'state' | 'stacktrace' | 'analysis'): void {
    this.activeSecondaryTab = tab;
  }

  /**
   * Get color for thread state
   */
  getThreadStateColor(state: string): string {
    switch (state) {
      case 'RUNNABLE':
        return 'var(--success-color, #28a745)';
      case 'BLOCKED':
        return 'var(--danger-color, #dc3545)';
      case 'WAITING':
        return 'var(--warning-color, #ffc107)';
      case 'TIMED_WAITING':
        return 'var(--info-color, #17a2b8)';
      case 'TERMINATED':
        return 'var(--secondary-color, #6c757d)';
      default:
        return 'var(--text-muted-color, #6c757d)';
    }
  }

  /**
   * Get background color for thread state
   */
  getThreadStateBackgroundColor(state: string): string {
    switch (state) {
      case 'RUNNABLE':
        return 'rgba(var(--success-color-rgb, 40, 167, 69), 0.1)';
      case 'BLOCKED':
        return 'rgba(var(--danger-color-rgb, 220, 53, 69), 0.1)';
      case 'WAITING':
        return 'rgba(var(--warning-color-rgb, 255, 193, 7), 0.1)';
      case 'TIMED_WAITING':
        return 'rgba(var(--info-color-rgb, 23, 162, 184), 0.1)';
      case 'TERMINATED':
        return 'rgba(var(--secondary-color-rgb, 108, 117, 125), 0.1)';
      default:
        return 'rgba(var(--text-muted-color-rgb, 108, 117, 125), 0.1)';
    }
  }

  /**
   * Get total thread count
   */
  getTotalThreadCount(): number {
    return this.threadDumpData?.threads?.length || 0;
  }

  /**
   * Check if any deadlocks are detected
   */
  hasDeadlocks(): boolean {
    return this.threadDumpData?.deadlockedThreads && this.threadDumpData.deadlockedThreads.length > 0;
  }

  /**
   * Get deadlocked threads
   */
  getDeadlockedThreads(): any[] {
    if (!this.threadDumpData?.deadlockedThreads || !this.threadDumpData?.threads) {
      return [];
    }

    return this.threadDumpData.threads.filter((thread: any) =>
      this.threadDumpData.deadlockedThreads.includes(thread.threadId)
    );
  }

  /**
   * Check if there are any threads in the specified state
   */
  hasThreadsInState(state: string): boolean {
    if (!this.filteredThreads || this.filteredThreads.length === 0) {
      return false;
    }

    return this.filteredThreads.some((thread: any) => thread.threadState === state);
  }

  /**
   * Get threads by state
   */
  getThreadsByState(state: string): any[] {
    if (!this.filteredThreads || this.filteredThreads.length === 0) {
      return [];
    }

    return this.filteredThreads.filter((thread: any) => thread.threadState === state);
  }

  // Make Object available in template
  Object = Object;

  /**
   * Load available analysis types
   */
  loadAnalysisTypes(): void {
    this.analysisTypesSubscription = this.actuatorDataService.getThreadDumpAnalysisTypes().subscribe({
      next: (types) => {
        this.analysisTypes = types;
        if (types.length > 0) {
          this.selectedAnalysisType = types[0].id;
        }
      },
      error: (error) => {
        console.error('Error loading analysis types:', error);
      }
    });
  }

  /**
   * Run thread dump analysis
   */
  runAnalysis(): void {
    if (!this.selectedAnalysisType) {
      return;
    }

    this.isAnalyzing = true;
    this.analysisResults = null;

    this.analysisSubscription = this.actuatorDataService.analyzeThreadDump(this.selectedAnalysisType).subscribe({
      next: (results) => {
        this.analysisResults = results;
        this.isAnalyzing = false;

        // Initialize expanded sections array for comprehensive analysis
        if (this.selectedAnalysisType === 'comprehensive' && results.analyses) {
          this.expandedSections = new Array(results.analyses.length).fill(false);
          // Expand the first section by default
          if (this.expandedSections.length > 0) {
            this.expandedSections[0] = true;
          }
        }
      },
      error: (error) => {
        console.error('Error running analysis:', error);
        this.isAnalyzing = false;
      }
    });
  }

  /**
   * Generate PDF from analysis results
   */
  downloadAnalysisAsPdf(): void {
    if (!this.analysisResults || !this.analysisResults.success) {
      alert('No analysis results available to download.');
      return;
    }

    try {
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Thread Dump Analysis Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Add timestamp
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const timestamp = new Date().toLocaleString();
      doc.text(`Generated on: ${timestamp}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Add analysis description
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(this.analysisResults.description || 'Thread Dump Analysis', margin, yPos);
      yPos += 10;

      // Handle different analysis types
      if (this.selectedAnalysisType === 'comprehensive') {
        this.addComprehensiveAnalysisToPdf(doc, yPos);
      } else {
        this.addSingleAnalysisToPdf(doc, yPos);
      }

      // Save the PDF
      const filename = `thread-analysis-${this.selectedAnalysisType}-${new Date().getTime()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('An error occurred while generating the PDF. Please try again.');
    }
  }

  /**
   * Add comprehensive analysis to PDF
   */
  private addComprehensiveAnalysisToPdf(doc: jsPDF, startY: number): void {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Loop through each analysis section
    for (const analysis of this.analysisResults.analyses) {
      // Check if we need a new page
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }

      // Add section title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(analysis.title, margin, yPos);
      yPos += 7;

      // Add section description
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(analysis.description, margin, yPos);
      yPos += 10;

      // Add section content based on type
      if (analysis.stateCounts) {
        // Thread State Distribution
        yPos = this.addThreadStateDistributionToPdf(doc, analysis, yPos);
      }

      if (analysis.deadlocksDetected !== undefined) {
        // Deadlock Analysis
        yPos = this.addDeadlockAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.contentionCount !== undefined) {
        // Lock Contention Analysis
        yPos = this.addLockContentionAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.poolCount !== undefined) {
        // Thread Pool Analysis
        yPos = this.addThreadPoolAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.uniqueMethodsCount !== undefined) {
        // Stack Trace Pattern Analysis
        yPos = this.addStackTracePatternAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.groupCount !== undefined) {
        // Thread Grouping Analysis
        yPos = this.addThreadGroupingAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.cpuIntensiveThreadCount !== undefined) {
        // CPU-Intensive Thread Analysis
        yPos = this.addCpuIntensiveThreadAnalysisToPdf(doc, analysis, yPos);
      }

      if (analysis.indicatorCount !== undefined) {
        // Memory Leak Indicators Analysis
        yPos = this.addMemoryLeakIndicatorsAnalysisToPdf(doc, analysis, yPos);
      }

      // Add separator
      yPos += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;
    }
  }

  /**
   * Add single analysis to PDF
   */
  private addSingleAnalysisToPdf(doc: jsPDF, startY: number): void {
    let yPos = startY;

    // Add content based on analysis type
    switch (this.selectedAnalysisType) {
      case 'state-distribution':
        yPos = this.addThreadStateDistributionToPdf(doc, this.analysisResults, yPos);
        break;
      case 'deadlock-detection':
        yPos = this.addDeadlockAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'lock-contention':
        yPos = this.addLockContentionAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'thread-pool':
        yPos = this.addThreadPoolAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'stack-trace-patterns':
        yPos = this.addStackTracePatternAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'thread-groups':
        yPos = this.addThreadGroupingAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'cpu-intensive':
        yPos = this.addCpuIntensiveThreadAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
      case 'memory-leak':
        yPos = this.addMemoryLeakIndicatorsAnalysisToPdf(doc, this.analysisResults, yPos);
        break;
    }
  }

  /**
   * Add thread state distribution to PDF
   */
  private addThreadStateDistributionToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add state distribution table
    if (analysis.stateCounts) {
      const tableData = Object.keys(analysis.stateCounts).map(state => [
        state,
        analysis.stateCounts[state].toString(),
        `${analysis.statePercentages[state]}%`
      ]);

      // Add table header
      tableData.unshift(['Thread State', 'Count', 'Percentage']);

      // Add total row
      tableData.push(['Total', analysis.totalThreads.toString(), '100%']);

      // Create table
      autoTable(doc, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [66, 139, 202] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'grid'
      });

      // Update yPos to after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    return yPos;
  }

  /**
   * Add deadlock analysis to PDF
   */
  private addDeadlockAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add deadlock status
    doc.setFontSize(12);
    if (analysis.deadlocksDetected) {
      doc.setTextColor(220, 53, 69); // Red for warning
      doc.text(`Deadlocks Detected: ${analysis.deadlockCount} threads involved in deadlocks`, margin, yPos);
      yPos += 10;

      // Add deadlock details if available
      if (analysis.deadlockDetails && analysis.deadlockDetails.length > 0) {
        const tableData = analysis.deadlockDetails.map((thread: any) => [
          thread.threadName,
          thread.threadId.toString(),
          thread.lockName || 'N/A',
          thread.lockOwnerName || 'N/A'
        ]);

        // Add table header
        tableData.unshift(['Thread Name', 'Thread ID', 'Waiting for Lock', 'Lock Held By']);

        // Create table
        autoTable(doc, {
          startY: yPos,
          head: [tableData[0]],
          body: tableData.slice(1),
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [66, 139, 202] },
          theme: 'grid'
        });

        // Update yPos to after the table
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setTextColor(40, 167, 69); // Green for success
      doc.text('No deadlocks detected in the thread dump', margin, yPos);
      yPos += 10;
    }

    return yPos;
  }

  /**
   * Add lock contention analysis to PDF
   */
  private addLockContentionAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add contention summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Contended Locks: ${analysis.contentionCount}`, margin, yPos);
    yPos += 10;

    // Add contention details if available
    if (analysis.contentionDetails && analysis.contentionDetails.length > 0) {
      for (const contention of analysis.contentionDetails) {
        // Check if we need a new page
        if (yPos > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Lock: ${contention.lockName}`, margin, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${contention.contentionCount} threads blocked`, margin, yPos);
        yPos += 10;

        // Add blocked threads table
        if (contention.blockedThreads && contention.blockedThreads.length > 0) {
          const tableData = contention.blockedThreads.map((thread: any) => [
            thread.threadName,
            thread.threadId.toString(),
            thread.lockOwnerName || 'N/A'
          ]);

          // Add table header
          tableData.unshift(['Thread Name', 'Thread ID', 'Lock Held By']);

          // Create table
          autoTable(doc, {
            startY: yPos,
            head: [tableData[0]],
            body: tableData.slice(1),
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [66, 139, 202] },
            theme: 'grid'
          });

          // Update yPos to after the table
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }
    } else {
      doc.setTextColor(40, 167, 69); // Green for success
      doc.text('No lock contention detected in the thread dump', margin, yPos);
      yPos += 10;
    }

    return yPos;
  }

  /**
   * Add thread pool analysis to PDF
   */
  private addThreadPoolAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add pool summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Thread Pools: ${analysis.poolCount}`, margin, yPos);
    yPos += 10;

    // Add pool details if available
    if (analysis.pools && analysis.pools.length > 0) {
      // Create table data
      const tableData = analysis.pools.map((pool: any) => {
        const stateDistribution = Object.keys(pool.stateDistribution)
          .map(state => `${state}: ${pool.stateDistribution[state]}`)
          .join(', ');

        return [
          pool.poolName,
          pool.threadCount.toString(),
          stateDistribution
        ];
      });

      // Add table header
      tableData.unshift(['Pool Name', 'Thread Count', 'State Distribution']);

      // Create table
      autoTable(doc, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [66, 139, 202] },
        theme: 'grid'
      });

      // Update yPos to after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    return yPos;
  }

  /**
   * Add stack trace pattern analysis to PDF
   */
  private addStackTracePatternAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add pattern summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Unique Methods: ${analysis.uniqueMethodsCount}`, margin, yPos);
    yPos += 10;

    // Add top methods if available
    if (analysis.topMethods && analysis.topMethods.length > 0) {
      // Create table data
      const tableData = analysis.topMethods.map((method: any, index: number) => [
        (index + 1).toString(),
        method.method,
        method.occurrences.toString()
      ]);

      // Add table header
      tableData.unshift(['Rank', 'Method', 'Occurrences']);

      // Create table
      autoTable(doc, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [66, 139, 202] },
        theme: 'grid',
        columnStyles: {
          1: { cellWidth: 'auto' }
        }
      });

      // Update yPos to after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    return yPos;
  }

  /**
   * Add thread grouping analysis to PDF
   */
  private addThreadGroupingAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add group summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Thread Groups: ${analysis.groupCount}`, margin, yPos);
    yPos += 10;

    // Add group details if available
    if (analysis.groups && analysis.groups.length > 0) {
      // Create table data
      const tableData = analysis.groups.map((group: any) => {
        const stateDistribution = Object.keys(group.stateDistribution)
          .map(state => `${state}: ${group.stateDistribution[state]}`)
          .join(', ');

        return [
          group.groupName,
          group.threadCount.toString(),
          stateDistribution
        ];
      });

      // Add table header
      tableData.unshift(['Group Name', 'Thread Count', 'State Distribution']);

      // Create table
      autoTable(doc, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [66, 139, 202] },
        theme: 'grid'
      });

      // Update yPos to after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    return yPos;
  }

  /**
   * Add CPU-intensive thread analysis to PDF
   */
  private addCpuIntensiveThreadAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add CPU-intensive summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`CPU-Intensive Threads: ${analysis.cpuIntensiveThreadCount}`, margin, yPos);
    yPos += 10;

    // Add CPU-intensive thread details if available
    if (analysis.cpuIntensiveThreads && analysis.cpuIntensiveThreads.length > 0) {
      // Create table data
      const tableData = analysis.cpuIntensiveThreads.map((thread: any) => {
        const topFrames = thread.topFrames ? thread.topFrames.join('\n') : 'N/A';
        return [
          thread.threadName,
          thread.threadId.toString(),
          topFrames
        ];
      });

      // Add table header
      tableData.unshift(['Thread Name', 'Thread ID', 'Top Stack Frames']);

      // Create table
      autoTable(doc, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [66, 139, 202] },
        theme: 'grid',
        columnStyles: {
          2: { cellWidth: 'auto' }
        }
      });

      // Update yPos to after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setTextColor(40, 167, 69); // Green for success
      doc.text('No CPU-intensive threads detected in the thread dump', margin, yPos);
      yPos += 10;
    }

    return yPos;
  }

  /**
   * Add memory leak indicators analysis to PDF
   */
  private addMemoryLeakIndicatorsAnalysisToPdf(doc: jsPDF, analysis: any, startY: number): number {
    let yPos = startY;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add memory leak indicators summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Memory Leak Indicators: ${analysis.indicatorCount}`, margin, yPos);
    yPos += 10;

    // Add memory leak indicators details if available
    if (analysis.indicators && analysis.indicators.length > 0) {
      for (const indicator of analysis.indicators) {
        // Check if we need a new page
        if (yPos > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(11);
        doc.setTextColor(220, 53, 69); // Red for warning
        doc.text(indicator.type, margin, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(indicator.description, margin, yPos);
        yPos += 10;

        // Add affected threads table if available
        if (indicator.threads && indicator.threads.length > 0) {
          const tableData = indicator.threads.map((thread: any) => {
            const details = [];
            if (thread.threadId) details.push(`ID: ${thread.threadId}`);
            if (thread.stackDepth) details.push(`Stack Depth: ${thread.stackDepth}`);

            return [
              thread.threadName,
              details.join(', ')
            ];
          });

          // Add table header
          tableData.unshift(['Thread Name', 'Details']);

          // Create table
          autoTable(doc, {
            startY: yPos,
            head: [tableData[0]],
            body: tableData.slice(1),
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [66, 139, 202] },
            theme: 'grid'
          });

          // Update yPos to after the table
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }
    } else {
      doc.setTextColor(40, 167, 69); // Green for success
      doc.text('No memory leak indicators detected in the thread dump', margin, yPos);
      yPos += 10;
    }

    return yPos;
  }

  /**
   * Toggle the expanded state of an analysis section
   */
  toggleAnalysisSection(index: number): void {
    if (!this.expandedSections[index]) {
      this.expandedSections[index] = true;
    } else {
      this.expandedSections[index] = false;
    }
  }

  /**
   * Select an analysis type and run the analysis
   */
  selectAnalysisType(type: string): void {
    this.selectedAnalysisType = type;
    this.runAnalysis();
  }

  /**
   * Get thread pool state entries as an array of key-value pairs
   */
  getThreadPoolStateEntries(poolKey: string): { key: string, value: number }[] {
    const pool = this.getThreadPoolInfo(poolKey);
    if (!pool || !pool.states) {
      return [];
    }

    return Object.entries(pool.states).map(([key, value]) => ({
      key,
      value: value as number
    }));
  }

  /**
   * Calculate the percentage of threads in a specific state for a thread pool
   */
  getStatePercentage(poolKey: string, state: { key: string, value: number }): number {
    const pool = this.getThreadPoolInfo(poolKey);
    if (!pool || pool.count === 0) {
      return 0;
    }

    return (state.value / pool.count) * 100;
  }
}
