import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { HighlightSearchPipe } from '../../../pipes/highlight-search.pipe';

@Component({
  selector: 'app-log-tab',
  templateUrl: './log-tab.component.html',
  styleUrls: ['./log-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightSearchPipe]
})
export class LogTabComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('logContainer') logContainer!: ElementRef;

  logContent: string = '';
  isLoading: boolean = true;
  logfileAvailable: boolean = false;
  autoRefresh: boolean = false;
  refreshInterval: number = 10; // seconds
  searchText: string = '';
  filterText: string = '';
  logLevels: string[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  selectedLogLevels: { [key: string]: boolean } = {
    'ERROR': true,
    'WARN': true,
    'INFO': true,
    'DEBUG': true,
    'TRACE': true
  };

  // Pagination properties
  logfileSize: number = 0;
  currentPosition: number = 0;
  pageSize: number = 50000; // Default chunk size in bytes
  hasMoreContent: boolean = false;
  isLoadingMore: boolean = false;
  isLoadingNewer: boolean = false;
  newestLogsFirst: boolean = false; // Default to showing oldest logs first (newest at bottom)
  lastFetchedPosition: number = 0; // Track the last position we fetched to support loading newer logs

  private refreshSubscription?: Subscription;
  private autoScrollEnabled: boolean = true;

  // Make Math available to the template
  Math = Math;

  constructor(
    private actuatorDataService: ActuatorDataService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.checkLogfileAvailability();
  }

  ngAfterViewInit(): void {
    // Initial scroll to bottom will be handled by fetchLogContent
    // when logs are loaded with !newestLogsFirst
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  checkLogfileAvailability(): void {
    this.actuatorDataService.getLogfileStatus().subscribe(status => {
      this.logfileAvailable = status.available;

      if (this.logfileAvailable) {
        // Get the logfile size first
        this.getLogfileSize();
      } else {
        this.isLoading = false;
        this.logContent = 'Logfile endpoint is not available. Make sure the Spring Boot Actuator logfile endpoint is enabled.';
      }
    });
  }

  getLogfileSize(): void {
    this.actuatorDataService.getLogfileSize().subscribe(size => {
      this.logfileSize = size;

      if (this.logfileSize > 0) {
        // Calculate the starting position to get the last chunk of the log
        const startPosition = Math.max(0, this.logfileSize - this.pageSize);
        this.currentPosition = startPosition;
        this.fetchLogContent(startPosition, this.logfileSize - 1);
      } else {
        this.isLoading = false;
        this.logContent = 'Logfile is empty or size could not be determined.';
      }
    });
  }

  fetchLogContent(start: number, end: number): void {
    this.isLoading = true;

    this.actuatorDataService.getLogfileRange(start, end).subscribe({
      next: (content) => {
        // Update the total size from the service if it was determined from Content-Range
        const totalSize = this.actuatorDataService.getLogfileTotalSize();
        if (totalSize > 0) {
          this.logfileSize = totalSize;
        }

        // Process the log content based on sort direction
        const lines = content.split('\n');

        // If newest logs first, reverse the lines
        if (this.newestLogsFirst) {
          lines.reverse();
        }

        this.logContent = lines.join('\n');
        this.isLoading = false;

        // Check if there's more content to load
        this.hasMoreContent = start > 0;

        // Track the last fetched position for loading newer logs
        this.lastFetchedPosition = end;

        // If showing newest logs at the bottom, scroll to bottom after content is loaded
        if (!this.newestLogsFirst) {
          // Use setTimeout to ensure the DOM has been updated before scrolling
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (error) => {
        console.error('Error fetching log content:', error);
        this.logContent = 'Failed to fetch log content. Error: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  loadMoreContent(): void {
    if (!this.hasMoreContent || this.isLoadingMore) {
      return;
    }

    this.isLoadingMore = true;

    // Calculate the new range to fetch
    const newEnd = this.currentPosition - 1;
    const newStart = Math.max(0, newEnd - this.pageSize + 1);

    // Store the current scroll position and height
    let scrollTop = 0;
    let scrollHeight = 0;
    if (this.logContainer) {
      const container = this.logContainer.nativeElement;
      scrollTop = container.scrollTop;
      scrollHeight = container.scrollHeight;
    }

    this.actuatorDataService.getLogfileRange(newStart, newEnd).subscribe({
      next: (content) => {
        const lines = content.split('\n');
        let processedContent = '';

        if (this.newestLogsFirst) {
          // Reverse the new content for newest-first display
          lines.reverse();
          processedContent = lines.join('\n');
          // Append the new content to the existing content (older logs go at the bottom)
          this.logContent = this.logContent + '\n' + processedContent;
        } else {
          // For oldest-first display, prepend the content (older logs go at the top)
          processedContent = lines.join('\n');
          // Prepend the new content to the existing content
          this.logContent = processedContent + '\n' + this.logContent;

          // When loading more content in oldest-first mode, we need to maintain the scroll position
          // so the user doesn't lose their place
          setTimeout(() => {
            if (this.logContainer) {
              const container = this.logContainer.nativeElement;
              const newScrollHeight = container.scrollHeight;
              // Adjust scroll position to account for the new content
              container.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
            }
          }, 100);
        }

        // Update the current position
        this.currentPosition = newStart;

        // Check if there's more content to load
        this.hasMoreContent = newStart > 0;

        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading more content:', error);
        this.isLoadingMore = false;
      }
    });
  }

  toggleAutoRefresh(): void {
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh(); // Stop any existing subscription

    this.refreshSubscription = interval(this.refreshInterval * 1000)
      .pipe(
        switchMap(() => {
          // Get the latest chunk of the log
          return this.actuatorDataService.getLogfileSize().pipe(
            switchMap(size => {
              if (size > 0) {
                this.logfileSize = size;
                const startPosition = Math.max(0, size - this.pageSize);
                return this.actuatorDataService.getLogfileRange(startPosition, size - 1);
              }
              return '';
            })
          );
        })
      )
      .subscribe({
        next: (content) => {
          if (content) {
            // Process the log content based on sort direction
            const lines = content.split('\n');

            // If newest logs first, reverse the lines
            if (this.newestLogsFirst) {
              lines.reverse();
            }

            this.logContent = lines.join('\n');

            this.currentPosition = Math.max(0, this.logfileSize - this.pageSize);
            this.hasMoreContent = this.currentPosition > 0;

            // Update the last fetched position for loading newer logs
            this.lastFetchedPosition = this.logfileSize - 1;

            // If showing newest logs at the bottom and auto-scroll is enabled, scroll to bottom
            if (!this.newestLogsFirst && this.autoScrollEnabled) {
              setTimeout(() => this.scrollToBottom(), 100);
            }
          }
        },
        error: (error) => {
          console.error('Error auto-refreshing log content:', error);
          this.autoRefresh = false;
          this.stopAutoRefresh();
        }
      });
  }

  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  refreshNow(): void {
    // Get the latest logfile size and fetch the latest content
    this.actuatorDataService.getLogfileSize().subscribe(size => {
      this.logfileSize = size;

      if (this.logfileSize > 0) {
        // Calculate the starting position to get the last chunk of the log
        const startPosition = Math.max(0, this.logfileSize - this.pageSize);
        this.currentPosition = startPosition;
        this.fetchLogContent(startPosition, this.logfileSize - 1);
      } else {
        this.isLoading = false;
        this.logContent = 'Logfile is empty or size could not be determined.';
      }
    });
  }

  // Track download state
  isDownloading: boolean = false;

  downloadLog(): void {
    if (this.isDownloading) {
      return; // Prevent multiple clicks
    }

    this.isDownloading = true;

    try {
      this.actuatorDataService.downloadLogfile();

      // Reset download state after a delay
      setTimeout(() => {
        this.isDownloading = false;
      }, 2000);
    } catch (error) {
      console.error('Error initiating download:', error);
      this.isDownloading = false;
      alert('Failed to download log file. Please try again.');
    }
  }

  scrollToBottom(): void {
    if (this.logContainer) {
      const container = this.logContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  isScrolledToBottom(): boolean {
    if (!this.logContainer) return false;

    const container = this.logContainer.nativeElement;
    const tolerance = 50; // pixels
    return container.scrollHeight - container.scrollTop - container.clientHeight < tolerance;
  }

  onScroll(): void {
    this.autoScrollEnabled = this.isScrolledToBottom();
  }

  toggleLogLevel(level: string): void {
    this.selectedLogLevels[level] = !this.selectedLogLevels[level];
  }

  getFilteredLogContent(): string {
    if (!this.logContent) return '';

    let filteredContent = this.logContent;

    // Apply log level filtering
    const enabledLevels = Object.entries(this.selectedLogLevels)
      .filter(([_, enabled]) => enabled)
      .map(([level]) => level);

    if (enabledLevels.length < this.logLevels.length) {
      const lines = filteredContent.split('\n');
      filteredContent = lines
        .filter(line => {
          // Check if line contains any of the enabled log levels
          return enabledLevels.some(level => line.includes(level));
        })
        .join('\n');
    }

    // Apply text filtering
    if (this.filterText) {
      const lines = filteredContent.split('\n');
      filteredContent = lines
        .filter(line => line.toLowerCase().includes(this.filterText.toLowerCase()))
        .join('\n');
    }

    return filteredContent;
  }

  // The highlightSearchText method is no longer needed as we're using the HighlightSearchPipe

  /**
   * Load newer logs when in oldest-first mode
   * This is called when the user clicks the "Load newer logs" button at the bottom
   */
  loadNewerLogs(): void {
    if (this.isLoadingNewer) {
      return;
    }

    this.isLoadingNewer = true;

    // Get the latest logfile size
    this.actuatorDataService.getLogfileSize().subscribe(size => {
      if (size > 0) {
        this.logfileSize = size;

        // If there are no new logs, just update the UI
        if (this.lastFetchedPosition >= size - 1) {
          this.isLoadingNewer = false;
          return;
        }

        // Calculate the range to fetch - from last fetched position to the end
        const start = this.lastFetchedPosition + 1;
        const end = size - 1;

        this.actuatorDataService.getLogfileRange(start, end).subscribe({
          next: (content) => {
            if (content.trim()) {
              const lines = content.split('\n');
              const processedContent = lines.join('\n');

              // In oldest-first mode, append the new content to the existing content
              this.logContent = this.logContent + '\n' + processedContent;

              // Update the last fetched position
              this.lastFetchedPosition = end;

              // Scroll to the bottom to show the new content
              setTimeout(() => this.scrollToBottom(), 100);
            }

            this.isLoadingNewer = false;
          },
          error: (error) => {
            console.error('Error loading newer content:', error);
            this.isLoadingNewer = false;
          }
        });
      } else {
        this.isLoadingNewer = false;
      }
    });
  }

  toggleSortDirection(): void {
    // Toggle the direction
    this.newestLogsFirst = !this.newestLogsFirst;

    // Refresh the logs with the new sort direction
    if (this.logContent) {
      // Simply reverse the current content
      const lines = this.logContent.split('\n');
      lines.reverse();
      this.logContent = lines.join('\n');

      // If switching to oldest-first (newest at bottom), scroll to bottom
      if (!this.newestLogsFirst) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    }

    // If auto-refresh is enabled, restart it to use the new sort direction
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }
}
