import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface ConditionItem {
  condition: string;
  message: string;
}

interface MatchedConditions {
  matched?: ConditionItem[];
  notMatched?: ConditionItem[];
}

interface ConditionsContext {
  positiveMatches?: { [key: string]: ConditionItem[] };
  negativeMatches?: { [key: string]: MatchedConditions };
  unconditionalClasses?: string[];
  parentId?: string;
}

interface ConditionsData {
  contexts?: { [key: string]: ConditionsContext };
}

@Component({
  selector: 'app-conditions-tab',
  templateUrl: './conditions-tab.component.html',
  styleUrls: ['./conditions-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ConditionsTabComponent implements OnInit, OnDestroy {
  conditionsData: ConditionsData | null = null;
  loading = true;
  error: string | null = null;
  searchText = '';
  filteredData: ConditionsData | null = null;
  showBackToTop = false;

  // Secondary tabs
  activeSecondaryTab: 'positive' | 'negative' | 'unconditional' = 'positive';

  // Counts for each tab
  positivesCount = 0;
  negativesCount = 0;
  unconditionalCount = 0;

  private dataSubscription?: Subscription;
  private readonly SCROLL_THRESHOLD = 300; // Pixels scrolled before showing back-to-top button

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    this.loadConditionsData();
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  loadConditionsData(): void {
    this.loading = true;
    this.error = null;
    this.resetCounts();

    this.actuatorDataService.getConditionsData().subscribe({
      next: (data) => {
        this.conditionsData = data;
        this.applySearch();
        this.calculateCounts(data);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load conditions data: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  applySearch(): void {
    if (!this.conditionsData) {
      this.filteredData = null;
      this.resetCounts();
      return;
    }

    if (!this.searchText.trim()) {
      this.filteredData = this.conditionsData;
      this.calculateCounts(this.conditionsData);
      return;
    }

    const searchLower = this.searchText.toLowerCase();

    // Deep clone the data to avoid modifying the original
    this.filteredData = JSON.parse(JSON.stringify(this.conditionsData)) as ConditionsData;

    // Filter and highlight matches in the contexts
    if (this.filteredData.contexts) {
      const contexts = this.filteredData.contexts;
      const filteredContexts: { [key: string]: ConditionsContext } = {};

      Object.keys(contexts).forEach(contextKey => {
        const context = contexts[contextKey];
        let contextMatches = false;

        // Check if context key contains search term and highlight it
        if (contextKey.toLowerCase().includes(searchLower)) {
          const highlightedKey = this.highlightText(contextKey, searchLower);
          if (highlightedKey !== contextKey && !filteredContexts[highlightedKey]) {
            // Create a copy of the context with the highlighted key
            filteredContexts[highlightedKey] = JSON.parse(JSON.stringify(context));
            contextMatches = true;
            // Continue processing to find other matches in this context
          }
        }

        // Check positive matches
        if (context.positiveMatches) {
          const filteredPositiveMatches: { [key: string]: ConditionItem[] } = {};

          Object.keys(context.positiveMatches).forEach(matchKey => {
            const match = context.positiveMatches![matchKey];
            const matchKeyLower = matchKey.toLowerCase();

            if (matchKeyLower.includes(searchLower)) {
              filteredPositiveMatches[matchKey] = match;
              contextMatches = true;

              // Highlight the match key
              const highlightedKey = this.highlightText(matchKey, searchLower);
              if (highlightedKey !== matchKey) {
                delete filteredPositiveMatches[matchKey];
                filteredPositiveMatches[highlightedKey] = match;
              }
            } else {
              // Check if any condition or condition message contains the search text
              const matchingConditions = match.filter((condition: ConditionItem) =>
                (condition.condition && condition.condition.toLowerCase().includes(searchLower)) ||
                (condition.message && condition.message.toLowerCase().includes(searchLower))
              );

              if (matchingConditions.length > 0) {
                filteredPositiveMatches[matchKey] = matchingConditions.map((condition: ConditionItem) => ({
                  ...condition,
                  condition: condition.condition && condition.condition.toLowerCase().includes(searchLower)
                    ? this.highlightText(condition.condition, searchLower)
                    : condition.condition,
                  message: condition.message && condition.message.toLowerCase().includes(searchLower)
                    ? this.highlightText(condition.message, searchLower)
                    : condition.message
                }));
                contextMatches = true;
              }
            }
          });

          if (Object.keys(filteredPositiveMatches).length > 0) {
            if (!filteredContexts[contextKey]) {
              filteredContexts[contextKey] = {};
            }
            filteredContexts[contextKey].positiveMatches = filteredPositiveMatches;
          }
        }

        // Check negative matches
        if (context.negativeMatches) {
          const filteredNegativeMatches: { [key: string]: MatchedConditions } = {};

          Object.keys(context.negativeMatches).forEach(matchKey => {
            const match = context.negativeMatches![matchKey];
            const matchKeyLower = matchKey.toLowerCase();

            if (matchKeyLower.includes(searchLower)) {
              filteredNegativeMatches[matchKey] = match;
              contextMatches = true;

              // Highlight the match key
              const highlightedKey = this.highlightText(matchKey, searchLower);
              if (highlightedKey !== matchKey) {
                delete filteredNegativeMatches[matchKey];
                filteredNegativeMatches[highlightedKey] = match;
              }
            } else {
              let matchFound = false;

              // Check notMatched conditions
              if (match.notMatched) {
                const matchingNotMatched = match.notMatched.filter((condition: ConditionItem) =>
                  (condition.condition && condition.condition.toLowerCase().includes(searchLower)) ||
                  (condition.message && condition.message.toLowerCase().includes(searchLower))
                );

                if (matchingNotMatched.length > 0) {
                  if (!filteredNegativeMatches[matchKey]) {
                    filteredNegativeMatches[matchKey] = { notMatched: [], matched: [] };
                  }

                  filteredNegativeMatches[matchKey].notMatched = matchingNotMatched.map((condition: ConditionItem) => ({
                    ...condition,
                    condition: condition.condition && condition.condition.toLowerCase().includes(searchLower)
                      ? this.highlightText(condition.condition, searchLower)
                      : condition.condition,
                    message: condition.message && condition.message.toLowerCase().includes(searchLower)
                      ? this.highlightText(condition.message, searchLower)
                      : condition.message
                  }));

                  matchFound = true;
                  contextMatches = true;
                }
              }

              // Check matched conditions
              if (match.matched) {
                const matchingMatched = match.matched.filter((condition: ConditionItem) =>
                  (condition.condition && condition.condition.toLowerCase().includes(searchLower)) ||
                  (condition.message && condition.message.toLowerCase().includes(searchLower))
                );

                if (matchingMatched.length > 0) {
                  if (!filteredNegativeMatches[matchKey]) {
                    filteredNegativeMatches[matchKey] = { notMatched: [], matched: [] };
                  }

                  filteredNegativeMatches[matchKey].matched = matchingMatched.map((condition: ConditionItem) => ({
                    ...condition,
                    condition: condition.condition && condition.condition.toLowerCase().includes(searchLower)
                      ? this.highlightText(condition.condition, searchLower)
                      : condition.condition,
                    message: condition.message && condition.message.toLowerCase().includes(searchLower)
                      ? this.highlightText(condition.message, searchLower)
                      : condition.message
                  }));

                  matchFound = true;
                  contextMatches = true;
                }
              }

              if (matchFound && !filteredNegativeMatches[matchKey]) {
                filteredNegativeMatches[matchKey] = match;
              }
            }
          });

          if (Object.keys(filteredNegativeMatches).length > 0) {
            if (!filteredContexts[contextKey]) {
              filteredContexts[contextKey] = {};
            }
            filteredContexts[contextKey].negativeMatches = filteredNegativeMatches;
          }
        }

        // Check unconditional classes
        if (context.unconditionalClasses) {
          const filteredUnconditionalClasses = context.unconditionalClasses.filter((className: string) =>
            className.toLowerCase().includes(searchLower)
          );

          if (filteredUnconditionalClasses.length > 0) {
            if (!filteredContexts[contextKey]) {
              filteredContexts[contextKey] = {};
            }

            filteredContexts[contextKey].unconditionalClasses = filteredUnconditionalClasses.map((className: string) =>
              this.highlightText(className, searchLower)
            );

            contextMatches = true;
          }
        }

        // If no matches in this context, don't include it
        if (!contextMatches) {
          delete filteredContexts[contextKey];
        }
      });

      // If no contexts match, show all data
      if (Object.keys(filteredContexts).length === 0) {
        this.filteredData = this.conditionsData;
        this.calculateCounts(this.conditionsData);
      } else {
        this.filteredData.contexts = filteredContexts;
        this.calculateCounts(this.filteredData);
      }
    }
  }

  /**
   * Calculate counts for each tab based on the filtered data
   */
  private calculateCounts(data: ConditionsData): void {
    this.resetCounts();

    if (!data || !data.contexts) {
      return;
    }

    Object.values(data.contexts).forEach(context => {
      // Count positive matches
      if (context.positiveMatches) {
        this.positivesCount += Object.keys(context.positiveMatches).length;
      }

      // Count negative matches
      if (context.negativeMatches) {
        this.negativesCount += Object.keys(context.negativeMatches).length;
      }

      // Count unconditional classes
      if (context.unconditionalClasses) {
        this.unconditionalCount += context.unconditionalClasses.length;
      }
    });
  }

  /**
   * Reset all counts to zero
   */
  private resetCounts(): void {
    this.positivesCount = 0;
    this.negativesCount = 0;
    this.unconditionalCount = 0;
  }

  /**
   * Highlights search terms in text with enhanced styling
   * @param text The text to search within
   * @param searchTerm The search term to highlight
   * @returns Text with highlighted search terms
   */
  highlightText(text: string, searchTerm: string): string {
    if (!text || !searchTerm || searchTerm.trim() === '') {
      return text;
    }

    try {
      // Escape special regex characters to prevent errors
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

      // Add highlight span around matches
      return text.replace(regex, (match) => {
        return `<span class="highlight-search">${match}</span>`;
      });
    } catch (error) {
      console.error('Error highlighting text:', error);
      return text; // Return original text if there's an error
    }
  }

  isEmptyObject(obj: any): boolean {
    return obj && Object.keys(obj).length === 0;
  }

  getObjectKeysCount(obj: any): number {
    if (!obj) {
      return 0;
    }
    return Object.keys(obj).length;
  }

  /**
   * Scrolls to the specified section with smooth animation
   * @param sectionId The ID of the section to scroll to
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    const scrollableContainer = document.getElementById('scrollable-results');

    if (element && scrollableContainer) {
      // Add a small delay to ensure the UI has updated
      setTimeout(() => {
        // Get all elements with the same ID (in case there are multiple contexts)
        const elements = document.querySelectorAll(`#${sectionId}`);
        if (elements.length > 0) {
          // Use the first element found
          const firstElement = elements[0];

          // Calculate the position relative to the scrollable container
          const containerRect = scrollableContainer.getBoundingClientRect();
          const elementRect = firstElement.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + scrollableContainer.scrollTop;

          // Add a small offset to account for any headers
          const scrollOffset = 20;

          // Scroll the container to the element
          scrollableContainer.scrollTo({
            top: Math.max(0, relativeTop - scrollOffset),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }

  /**
   * Handles scroll events in the results container
   * @param event The scroll event
   */
  onResultsScroll(event: Event): void {
    const scrollableContainer = event.target as HTMLElement;
    this.showBackToTop = scrollableContainer.scrollTop > this.SCROLL_THRESHOLD;
  }

  /**
   * Scrolls back to the top of the results container
   */
  scrollToTop(): void {
    const scrollableContainer = document.getElementById('scrollable-results');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Switch to a different secondary tab
   * @param tab The tab to switch to
   */
  switchSecondaryTab(tab: 'positive' | 'negative' | 'unconditional'): void {
    this.activeSecondaryTab = tab;

    // Reset scroll position when switching tabs
    setTimeout(() => {
      this.scrollToTop();
    }, 50);
  }
}
