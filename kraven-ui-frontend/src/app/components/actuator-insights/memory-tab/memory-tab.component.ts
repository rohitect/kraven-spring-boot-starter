import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ActuatorDataService } from '../services/actuator-data.service';
import * as d3 from 'd3';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-memory-tab',
  templateUrl: './memory-tab.component.html',
  styleUrls: ['./memory-tab.component.scss', './memory-analysis.scss', './notification.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class MemoryTabComponent implements OnInit, OnDestroy, AfterViewInit {
  memoryData: any = null;
  isLoading = false;
  heapDumpExists: boolean = false;
  heapDumpInfo: any = null;

  // Secondary tabs
  activeSecondaryTab: 'overview' | 'heap' | 'nonheap' | 'gc' | 'analysis' = 'overview';

  // Analysis tab
  analysisTypes: any[] = [];
  selectedAnalysisType: string = '';
  analysisResults: any = null;
  isAnalyzing: boolean = false;
  isRequestingDump: boolean = false;
  lastDumpTimestamp: Date | null = null;
  expandedSections: boolean[] = [];

  private dataSubscription?: Subscription;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    // this.loadMemoryData();

    // Check if a heap dump exists
    this.checkHeapDumpExists();

    // Load analysis types
    this.loadAnalysisTypes();
  }

  /**
   * Check if a heap dump exists on the server
   */
  checkHeapDumpExists(): void {
    this.isLoading = true;
    this.actuatorDataService.checkHeapDumpExists().subscribe({
      next: (response) => {
        this.heapDumpExists = response.exists;
        this.heapDumpInfo = response;
        this.isLoading = false;

        // If a heap dump exists, we can show the analysis tab even without memory data
        if (this.heapDumpExists && this.activeSecondaryTab !== 'analysis') {
          this.activeSecondaryTab = 'analysis';
        }
      },
      error: (error) => {
        console.error('Error checking if heap dump exists:', error);
        this.heapDumpExists = false;
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialize D3 visualizations if analysis results are available
    if (this.analysisResults && this.selectedAnalysisType === 'objectDistribution') {
      this.renderTopClassesChart();
    }
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.analysisTypesSubscription) {
      this.analysisTypesSubscription.unsubscribe();
    }
    if (this.analysisSubscription) {
      this.analysisSubscription.unsubscribe();
    }
  }

  private analysisTypesSubscription?: Subscription;
  private analysisSubscription?: Subscription;


  /**
   * Switch to a different secondary tab
   */
  switchSecondaryTab(tab: 'overview' | 'heap' | 'nonheap' | 'gc' | 'analysis'): void {
    this.activeSecondaryTab = tab;
  }

  /**
   * Format bytes to a human-readable string
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || !isFinite(bytes)) return 'N/A';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(used: number, max: number): number {
    if (max <= 0 || isNaN(max) || isNaN(used)) return 0;
    return (used / max) * 100;
  }

  /**
   * Load available memory analysis types
   */
  loadAnalysisTypes(): void {
    this.analysisTypesSubscription = this.actuatorDataService.getMemoryAnalysisTypes().subscribe({
      next: (types) => {
        this.analysisTypes = types;
        if (types.length > 0) {
          this.selectedAnalysisType = types[0].id;
        }
      },
      error: (error) => {
        console.error('Error loading memory analysis types:', error);
      }
    });
  }

  /**
   * Request a heap dump from the server
   */
  requestHeapDump(): void {
    if (this.isRequestingDump) {
      return;
    }

    this.isRequestingDump = true;

    this.actuatorDataService.requestHeapDump().subscribe({
      next: (response) => {
        // Add a small delay to show the loading state
        setTimeout(() => {
          this.isRequestingDump = false;
          this.lastDumpTimestamp = new Date();

          // Show success notification with file path if available
          const message = response.filePath
            ? `Heap dump created and saved to ${response.filePath}`
            : 'Heap dump created successfully on the server';
          this.showNotification(message, 'success');

          // Check if a heap dump exists after creating one
          this.checkHeapDumpExists();
        }, 1000);
      },
      error: (error) => {
        console.error('Error requesting heap dump:', error);

        // Add a small delay to show the loading state
        setTimeout(() => {
          this.isRequestingDump = false;

          // Show error notification
          this.showNotification('Failed to create heap dump on the server', 'error');
        }, 1000);
      }
    });
  }

  /**
   * Show a notification message
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;

    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = 'fas';
    if (type === 'success') {
      icon.classList.add('fa-check-circle');
    } else if (type === 'error') {
      icon.classList.add('fa-exclamation-circle');
    } else {
      icon.classList.add('fa-info-circle');
    }
    notification.appendChild(icon);

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(notification);
    });
    notification.appendChild(closeBtn);

    // Add to body
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Run memory dump analysis
   */
  runAnalysis(): void {
    if (!this.selectedAnalysisType) {
      return;
    }

    this.isAnalyzing = true;
    this.analysisResults = null;

    this.analysisSubscription = this.actuatorDataService.analyzeMemoryDump(this.selectedAnalysisType).subscribe({
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

        // Render D3 visualizations if needed
        setTimeout(() => {
          if (this.selectedAnalysisType === 'objectDistribution') {
            this.renderTopClassesChart();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error running memory analysis:', error);
        this.isAnalyzing = false;
      }
    });
  }

  /**
   * Render the top classes chart using D3.js
   */
  renderTopClassesChart(): void {
    if (!this.analysisResults || !this.analysisResults.topClasses || this.analysisResults.topClasses.length === 0) {
      return;
    }

    // Clear any existing chart
    d3.select('#topClassesChart').selectAll('*').remove();

    // Define interface for our data
    interface ClassData {
      className: string;
      objectCount: number;
      totalSize: number;
      avgSize: number;
    }

    const data: ClassData[] = this.analysisResults.topClasses.slice(0, 10); // Take top 10 classes

    // Set up dimensions
    const element = document.getElementById('topClassesChart');
    if (!element) return;

    const margin = { top: 30, right: 30, bottom: 70, left: 80 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#topClassesChart')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleBand<string>()
      .domain(data.map(d => this.getShortClassName(d.className)))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.totalSize) || 0])
      .range([height, 0]);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, data.length]);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d => this.formatBytes(d as number)))
      .selectAll('text')
      .style('font-size', '10px');

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Top Memory Consuming Classes');

    // Add bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: ClassData) => x(this.getShortClassName(d.className)) || 0)
      .attr('y', (d: ClassData) => y(d.totalSize))
      .attr('width', x.bandwidth())
      .attr('height', (d: ClassData) => height - y(d.totalSize))
      .attr('fill', (_: ClassData, i: number) => colorScale(i))
      .attr('rx', 4) // Rounded corners
      .attr('ry', 4)
      .on('mouseover', (event: MouseEvent, d: ClassData) => {
        d3.select(event.currentTarget as Element).attr('opacity', 0.8);

        // Show tooltip
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);

        tooltip.html(`
          <strong>${d.className}</strong><br/>
          Size: ${this.formatBytes(d.totalSize)}<br/>
          Count: ${d.objectCount.toLocaleString()}<br/>
          Avg: ${this.formatBytes(d.avgSize)}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element).attr('opacity', 1);

        // Hide tooltip
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'var(--tooltip-bg-color, rgba(0, 0, 0, 0.8))')
      .style('color', 'var(--tooltip-text-color, white)')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('z-index', '1000');
  }

  /**
   * Get short class name (without package)
   */
  private getShortClassName(fullClassName: string): string {
    const parts = fullClassName.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Toggle expanded section
   */
  toggleSection(index: number): void {
    this.expandedSections[index] = !this.expandedSections[index];
  }

  /**
   * Generate PDF report of analysis results
   */
  downloadPdfReport(): void {
    if (!this.analysisResults) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Add title
    doc.setFontSize(18);
    doc.text('Memory Analysis Report', 105, yPos, { align: 'center' });
    yPos += 15;

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Add analysis type
    doc.setFontSize(14);
    const analysisType = this.analysisTypes.find(t => t.id === this.selectedAnalysisType)?.name || this.selectedAnalysisType;
    doc.text(`Analysis Type: ${analysisType}`, 14, yPos);
    yPos += 10;

    // Add summary
    if (this.analysisResults.summary) {
      doc.setFontSize(14);
      doc.text('Summary', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(this.analysisResults.summary, 180);
      doc.text(summaryLines, 14, yPos);
      yPos += summaryLines.length * 6 + 10;
    }

    // Add detailed results based on analysis type
    if (this.selectedAnalysisType === 'objectDistribution' && this.analysisResults.topClasses) {
      this.addObjectDistributionToPdf(doc, yPos);
    } else if (this.selectedAnalysisType === 'memoryLeak' && this.analysisResults.suspectedLeaks) {
      this.addMemoryLeakToPdf(doc, yPos);
    } else if (this.selectedAnalysisType === 'comprehensive' && this.analysisResults.analyses) {
      this.addComprehensiveAnalysisToPdf(doc, yPos);
    }

    // Save the PDF
    doc.save('memory-analysis-report.pdf');
  }

  /**
   * Add object distribution analysis to PDF
   */
  private addObjectDistributionToPdf(doc: any, startY: number): void {
    let yPos = startY;

    doc.setFontSize(14);
    doc.text('Top Memory Consuming Classes', 14, yPos);
    yPos += 10;

    // Create table for top classes
    const tableData = this.analysisResults.topClasses.map((cls: any) => [
      cls.className,
      this.formatBytes(cls.totalSize),
      cls.objectCount.toLocaleString(),
      this.formatBytes(cls.avgSize)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Class Name', 'Total Size', 'Object Count', 'Avg Size']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
  }

  /**
   * Add memory leak analysis to PDF
   */
  private addMemoryLeakToPdf(doc: any, startY: number): void {
    let yPos = startY;

    doc.setFontSize(14);
    doc.text('Suspected Memory Leaks', 14, yPos);
    yPos += 10;

    // Create table for suspected leaks
    const tableData = this.analysisResults.suspectedLeaks.map((leak: any) => [
      leak.className,
      leak.instanceCount.toLocaleString(),
      this.formatBytes(leak.totalSize),
      leak.suspicionReason
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Class Name', 'Instance Count', 'Total Size', 'Suspicion Reason']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
  }

  /**
   * Add comprehensive analysis to PDF
   */
  private addComprehensiveAnalysisToPdf(doc: any, startY: number): void {
    let yPos = startY;

    for (const analysis of this.analysisResults.analyses) {
      // Add page if needed
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text(analysis.title, 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const descriptionLines = doc.splitTextToSize(analysis.description || '', 180);
      doc.text(descriptionLines, 14, yPos);
      yPos += descriptionLines.length * 6 + 5;

      // Add findings if available
      if (analysis.findings && analysis.findings.length > 0) {
        const tableData = analysis.findings.map((finding: any) => [
          finding.key,
          finding.value,
          finding.impact || ''
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Finding', 'Value', 'Impact']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });

        // Update yPos after table
        const finalY = (doc as any).lastAutoTable.finalY;
        yPos = finalY + 15;
      } else {
        yPos += 10;
      }
    }
  }

  /**
   * Get color for memory usage based on percentage
   */
  getColorByPercentage(percentage: number): string {
    if (percentage < 60) return 'var(--success-color)';
    if (percentage < 80) return 'var(--warning-color)';
    return 'var(--danger-color)';
  }
}
