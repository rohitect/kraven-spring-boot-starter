import { Injectable } from '@angular/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiTab, ApiTabsState } from '../models/api-tab.model';

@Injectable({
  providedIn: 'root'
})
export class ApiTabService {
  private readonly STORE_NAME = 'api-tabs';
  private readonly DB_VERSION = 1;
  private readonly MAX_TABS = 15;
  private dbName: string = '';

  constructor() {
    // Database will be initialized when setApplicationName is called
  }

  /**
   * Set the application name and initialize the database
   * This must be called before using any other methods
   */
  setApplicationName(applicationName: string): void {
    // Sanitize the application name to create a valid database name
    // Replace spaces and special characters with hyphens
    const sanitizedName = applicationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens

    this.dbName = `${sanitizedName}-kraven-api-tabs`;
    console.log(`Using tabs database: ${this.dbName}`);

    // Initialize the database with the new name
    this.initDatabase();
  }

  /**
   * Initialize the IndexedDB database
   */
  private initDatabase(): void {
    if (!this.dbName) {
      console.error('Database name not set. Call setApplicationName first.');
      return;
    }

    const request = indexedDB.open(this.dbName, this.DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(this.STORE_NAME)) {
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });

        // Create indexes for faster queries
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
      }
    };

    request.onerror = (event) => {
      console.error(`Error opening IndexedDB ${this.dbName}:`, (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = () => {
      console.log(`Successfully opened tabs database: ${this.dbName}`);
    };
  }

  /**
   * Get a connection to the database
   */
  private getDatabase(): Promise<IDBDatabase> {
    if (!this.dbName) {
      return Promise.reject(new Error('Database name not set. Call setApplicationName first.'));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.DB_VERSION);

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * Get all tabs
   */
  getAllTabs(): Observable<ApiTab[]> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiTab[]>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.getAll();

          request.onsuccess = (event) => {
            const tabs = (event.target as IDBRequest).result as ApiTab[];

            // Sort by order to maintain tab positions
            tabs.sort((a, b) => {
              // If order is defined on both tabs, use it
              if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
              }
              // If order is missing on either tab, fall back to last accessed time
              return b.lastAccessedAt - a.lastAccessedAt;
            });

            observer.next(tabs);
            observer.complete();
          };

          request.onerror = (event) => {
            observer.error((event.target as IDBRequest).error);
          };

          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();

          return {
            unsubscribe: () => {
              // Nothing to clean up
            }
          };
        });
      }),
      catchError(error => {
        console.error('Error getting tabs:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a tab by ID
   */
  getTabById(id: string): Observable<ApiTab | null> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiTab | null>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.get(id);

          request.onsuccess = (event) => {
            const tab = (event.target as IDBRequest).result as ApiTab;
            observer.next(tab || null);
            observer.complete();
          };

          request.onerror = (event) => {
            observer.error((event.target as IDBRequest).error);
          };

          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();

          return {
            unsubscribe: () => {
              // Nothing to clean up
            }
          };
        });
      }),
      catchError(error => {
        console.error('Error getting tab by ID:', error);
        return of(null);
      })
    );
  }

  /**
   * Save a tab
   */
  saveTab(tab: ApiTab): Observable<ApiTab> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiTab>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          // Update the last accessed time
          const updatedTab = {
            ...tab,
            lastAccessedAt: Date.now()
          };

          const request = store.put(updatedTab);

          request.onsuccess = () => {
            observer.next(updatedTab);
            observer.complete();
          };

          request.onerror = (event) => {
            observer.error((event.target as IDBRequest).error);
          };

          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();

          return {
            unsubscribe: () => {
              // Nothing to clean up
            }
          };
        });
      }),
      catchError(error => {
        console.error('Error saving tab:', error);
        return throwError(() => new Error('Failed to save tab'));
      })
    );
  }

  /**
   * Delete a tab
   */
  deleteTab(id: string): Observable<void> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<void>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.delete(id);

          request.onsuccess = () => {
            observer.next();
            observer.complete();
          };

          request.onerror = (event) => {
            observer.error((event.target as IDBRequest).error);
          };

          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();

          return {
            unsubscribe: () => {
              // Nothing to clean up
            }
          };
        });
      }),
      catchError(error => {
        console.error('Error deleting tab:', error);
        return throwError(() => new Error('Failed to delete tab'));
      })
    );
  }

  /**
   * Clear all tabs
   */
  clearAllTabs(): Observable<void> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<void>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.clear();

          request.onsuccess = () => {
            observer.next();
            observer.complete();
          };

          request.onerror = (event) => {
            observer.error((event.target as IDBRequest).error);
          };

          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();

          return {
            unsubscribe: () => {
              // Nothing to clean up
            }
          };
        });
      }),
      catchError(error => {
        console.error('Error clearing tabs:', error);
        return throwError(() => new Error('Failed to clear tabs'));
      })
    );
  }

  /**
   * Get the active tab ID
   */
  getActiveTabId(): Observable<string | null> {
    return this.getAllTabs().pipe(
      map(tabs => {
        if (tabs.length === 0) {
          return null;
        }

        // Find the tab with the most recent last accessed time
        const activeTab = tabs.reduce((prev, current) => {
          return (prev.lastAccessedAt > current.lastAccessedAt) ? prev : current;
        });

        return activeTab.id;
      })
    );
  }

  /**
   * Set the active tab
   */
  setActiveTab(id: string): Observable<ApiTab | null> {
    return this.getTabById(id).pipe(
      switchMap(tab => {
        if (!tab) {
          return of(null);
        }

        // Update the last accessed time
        const updatedTab = {
          ...tab,
          lastAccessedAt: Date.now()
        };

        return this.saveTab(updatedTab);
      })
    );
  }

  /**
   * Check if we've reached the maximum number of tabs
   */
  hasReachedMaxTabs(): Observable<boolean> {
    return this.getAllTabs().pipe(
      map(tabs => tabs.length >= this.MAX_TABS)
    );
  }

  /**
   * Create a new tab for an endpoint
   */
  createTab(endpoint: any, tagName: string): Observable<ApiTab> {
    // Generate a unique ID for the tab
    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get the next order value for the new tab
    return this.getNextTabOrder().pipe(
      switchMap(nextOrder => {
        // Create the tab
        const tab: ApiTab = {
          id,
          title: `${endpoint.method.type} ${this.getEndpointTitle(endpoint)}`,
          tagName,
          path: endpoint.path,
          method: endpoint.method.type,
          methodType: endpoint.method.type.toLowerCase(),
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          order: nextOrder,
          endpoint: this.cleanEndpointForStorage(endpoint),
          responseSamples: {},
          selectedResponseCode: null,
          rightPaneActiveTab: 'try-it-out'
        };

        return this.saveTab(tab);
      })
    );
  }

  /**
   * Get the next order value for a new tab
   */
  private getNextTabOrder(): Observable<number> {
    return this.getAllTabs().pipe(
      map(tabs => {
        if (tabs.length === 0) {
          return 0; // First tab gets order 0
        }

        // Find the highest order value and add 1
        const maxOrder = Math.max(...tabs.map(tab => tab.order !== undefined ? tab.order : 0));
        return maxOrder + 1;
      })
    );
  }

  /**
   * Find a tab for an endpoint, or create one if it doesn't exist
   */
  findOrCreateTab(endpoint: any, tagName: string): Observable<ApiTab> {
    return this.getAllTabs().pipe(
      switchMap(tabs => {
        // Check if we already have a tab for this endpoint
        const existingTab = tabs.find(tab =>
          tab.path === endpoint.path &&
          tab.methodType === endpoint.method.type.toLowerCase()
        );

        if (existingTab) {
          // Update the last accessed time
          return this.setActiveTab(existingTab.id).pipe(
            map(tab => tab as ApiTab) // We know it's not null because we found it
          );
        }

        // Check if we've reached the maximum number of tabs
        if (tabs.length >= this.MAX_TABS) {
          return throwError(() => new Error('Maximum number of tabs reached'));
        }

        // Create a new tab
        return this.createTab(endpoint, tagName);
      })
    );
  }

  /**
   * Update a tab's response samples
   */
  updateTabResponseSamples(id: string, responseSamples: { [code: string]: any }, selectedResponseCode: string | null): Observable<ApiTab | null> {
    return this.getTabById(id).pipe(
      switchMap(tab => {
        if (!tab) {
          return of(null);
        }

        // Update the tab
        const updatedTab = {
          ...tab,
          responseSamples,
          selectedResponseCode,
          lastAccessedAt: Date.now()
        };

        return this.saveTab(updatedTab);
      })
    );
  }

  /**
   * Update a tab's right pane active tab
   */
  updateTabRightPaneActiveTab(id: string, rightPaneActiveTab: 'try-it-out' | 'response-samples'): Observable<ApiTab | null> {
    return this.getTabById(id).pipe(
      switchMap(tab => {
        if (!tab) {
          return of(null);
        }

        // Update the tab
        const updatedTab = {
          ...tab,
          rightPaneActiveTab,
          lastAccessedAt: Date.now()
        };

        return this.saveTab(updatedTab);
      })
    );
  }

  /**
   * Delete multiple tabs by ID
   */
  deleteTabs(ids: string[]): Observable<void> {
    if (ids.length === 0) {
      return of(void 0);
    }

    // Create an observable for each tab deletion
    const deleteObservables = ids.map(id => this.deleteTab(id));

    // Execute all deletions in parallel
    return forkJoin(deleteObservables).pipe(
      map(() => void 0)
    );
  }

  /**
   * Update a tab with new properties
   */
  updateTab(tab: ApiTab): Observable<ApiTab> {
    return this.getTabById(tab.id).pipe(
      switchMap(existingTab => {
        if (!existingTab) {
          return throwError(() => new Error(`Tab with ID ${tab.id} not found`));
        }

        // Merge the existing tab with the updated properties
        const updatedTab = {
          ...existingTab,
          ...tab,
          lastAccessedAt: Date.now()
        };

        return this.saveTab(updatedTab);
      })
    );
  }

  /**
   * Reorder tabs by moving a tab to a new position
   * @param tabId The ID of the tab to move
   * @param newIndex The new index for the tab
   */
  reorderTabs(tabId: string, newIndex: number): Observable<ApiTab[]> {
    return this.getAllTabs().pipe(
      switchMap(tabs => {
        // Find the tab to move
        const tabToMove = tabs.find(tab => tab.id === tabId);
        if (!tabToMove) {
          return throwError(() => new Error('Tab not found'));
        }

        // Remove the tab from its current position
        const remainingTabs = tabs.filter(tab => tab.id !== tabId);

        // Insert the tab at the new position
        const newTabs = [
          ...remainingTabs.slice(0, newIndex),
          tabToMove,
          ...remainingTabs.slice(newIndex)
        ];

        // Update the order property of all tabs
        const updatedTabs = newTabs.map((tab, index) => ({
          ...tab,
          order: index
        }));

        // Save all tabs with their new order
        return forkJoin(
          updatedTabs.map(tab => this.saveTab(tab))
        ).pipe(
          map(() => updatedTabs)
        );
      })
    );
  }

  /**
   * Get a title for an endpoint
   */
  private getEndpointTitle(endpoint: any): string {
    // Try to get a title from the operation summary or path
    return endpoint.method.operation.summary || this.getShortPath(endpoint.path);
  }

  /**
   * Get a shortened version of a path
   */
  private getShortPath(path: string): string {
    // Remove leading slash
    let shortPath = path.startsWith('/') ? path.substring(1) : path;

    // If the path is too long, truncate it
    if (shortPath.length > 30) {
      const parts = shortPath.split('/');
      if (parts.length > 2) {
        shortPath = `${parts[0]}/.../${parts[parts.length - 1]}`;
      }
    }

    return shortPath;
  }

  /**
   * Clean an endpoint object for storage
   * This removes circular references and unnecessary data
   */
  private cleanEndpointForStorage(endpoint: any): any {
    // Create a deep copy of the endpoint to avoid modifying the original
    const cleanEndpoint = JSON.parse(JSON.stringify({
      path: endpoint.path,
      method: {
        type: endpoint.method.type,
        operation: endpoint.method.operation
      }
    }));

    return cleanEndpoint;
  }
}
