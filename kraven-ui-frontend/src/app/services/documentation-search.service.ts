import { Injectable } from '@angular/core';
import { DocumentationService, DocumentationGroup, DocumentationFile } from './documentation.service';
import { Observable, of, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

export interface SearchResult {
  groupId: string;
  groupTitle: string;
  fileId: string;
  fileTitle: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  text: string;
  highlight: string;
  position: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentationSearchService {
  private groups: DocumentationGroup[] = [];
  private searchCache: Map<string, SearchResult[]> = new Map();
  private contentCache: Map<string, string> = new Map();

  constructor(private documentationService: DocumentationService) {
    // Initialize by loading all groups
    this.loadAllGroups();
  }

  /**
   * Load all documentation groups
   */
  private loadAllGroups(): void {
    this.documentationService.getAllGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
      },
      error: (error) => {
        console.error('Error loading groups for search:', error);
      }
    });
  }

  /**
   * Search all documentation for a query
   */
  searchDocumentation(query: string): Observable<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const normalizedQuery = query.trim().toLowerCase();

    // Check cache first
    if (this.searchCache.has(normalizedQuery)) {
      return of(this.searchCache.get(normalizedQuery) || []);
    }

    // If groups aren't loaded yet, load them first
    if (this.groups.length === 0) {
      return this.documentationService.getAllGroups().pipe(
        switchMap(groups => {
          this.groups = groups;
          return this.performSearch(normalizedQuery);
        })
      );
    }

    return this.performSearch(normalizedQuery);
  }

  /**
   * Perform the actual search across all documents
   */
  private performSearch(query: string): Observable<SearchResult[]> {
    // Create an array of observables for each group
    const searchObservables = this.groups.map(group => {
      return this.searchGroup(group, query);
    });

    // Combine all search results
    return forkJoin(searchObservables).pipe(
      map(results => {
        // Flatten the array of arrays
        const flatResults = results.reduce((acc, val) => acc.concat(val), []);

        // Cache the results
        this.searchCache.set(query, flatResults);

        return flatResults;
      }),
      catchError(error => {
        console.error('Error searching documentation:', error);
        return of([]);
      })
    );
  }

  /**
   * Search a specific group for the query
   */
  private searchGroup(group: DocumentationGroup, query: string): Observable<SearchResult[]> {
    // Create an array of observables for each file in the group
    const fileObservables = group.files.map(file => {
      return this.searchFile(group, file, query);
    });

    // If there's an overview file, search that too
    if (group.overview) {
      fileObservables.push(this.searchFile(group, group.overview, query));
    }

    // Combine all file search results
    return forkJoin(fileObservables).pipe(
      map(results => {
        // Filter out null results and return
        return results.filter(result => result !== null) as SearchResult[];
      }),
      catchError(error => {
        console.error(`Error searching group ${group.id}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Search a specific file for the query
   */
  private searchFile(group: DocumentationGroup, file: DocumentationFile, query: string): Observable<SearchResult | null> {
    // If we already have the content in cache, search it directly
    if (this.contentCache.has(file.id)) {
      const content = this.contentCache.get(file.id) || '';
      const matches = this.findMatches(content, query);

      if (matches.length > 0) {
        return of({
          groupId: group.id,
          groupTitle: group.title,
          fileId: file.id,
          fileTitle: file.title,
          matches
        });
      }

      return of(null);
    }

    // Otherwise, get the file content first by fetching the file
    return this.documentationService.getFile(file.id).pipe(
      map(fileData => {
        // Get the content from the file
        const content = fileData.content;

        // Try to decode base64 content if needed
        let decodedContent: string;
        try {
          decodedContent = this.documentationService.decodeBase64Content(content);
        } catch (error) {
          decodedContent = content;
        }

        // Cache the content for future searches
        this.contentCache.set(file.id, decodedContent);

        // Find matches
        const matches = this.findMatches(decodedContent, query);

        if (matches.length > 0) {
          return {
            groupId: group.id,
            groupTitle: group.title,
            fileId: file.id,
            fileTitle: file.title,
            matches
          };
        }

        return null;
      }),
      catchError(error => {
        console.error(`Error searching file ${file.id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Find all matches of the query in the content
   */
  private findMatches(content: string, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const normalizedContent = content.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    let position = 0;
    while ((position = normalizedContent.indexOf(normalizedQuery, position)) !== -1) {
      // Get a snippet of text around the match
      const start = Math.max(0, position - 50);
      const end = Math.min(content.length, position + query.length + 50);
      let snippet = content.substring(start, end);

      // Add ellipsis if we're not at the beginning or end
      if (start > 0) {
        snippet = '...' + snippet;
      }
      if (end < content.length) {
        snippet = snippet + '...';
      }

      // Create the highlighted version
      const highlightStart = Math.max(0, position - start) + (start > 0 ? 3 : 0); // Add 3 for the ellipsis
      const highlightEnd = highlightStart + query.length;
      const highlight = snippet.substring(0, highlightStart) +
                        '<mark>' + snippet.substring(highlightStart, highlightEnd) + '</mark>' +
                        snippet.substring(highlightEnd);

      matches.push({
        text: snippet,
        highlight,
        position
      });

      // Move past this match
      position += query.length;
    }

    return matches;
  }

  /**
   * Clear the search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
}
