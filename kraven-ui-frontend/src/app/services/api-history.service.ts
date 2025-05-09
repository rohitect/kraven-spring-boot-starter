import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiHistoryEntry, ApiHistoryGroup } from '../models/api-history.model';

@Injectable({
  providedIn: 'root'
})
export class ApiHistoryService {
  private readonly STORE_NAME = 'api-calls';
  private readonly DB_VERSION = 1;
  private readonly MAX_ENTRIES = 100;
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

    this.dbName = `${sanitizedName}-kraven-api-play-history`;
    // console.log(`Using database: ${this.dbName}`);

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
        const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });

        // Create index for timestamp for faster queries and sorting
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onerror = (event) => {
      console.error(`Error opening IndexedDB ${this.dbName}:`, (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = () => {
      // console.log(`Successfully opened database: ${this.dbName}`);
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
   * Save an API call to history
   */
  saveApiCall(entry: ApiHistoryEntry): Observable<ApiHistoryEntry> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiHistoryEntry>(observer => {
          // Start a transaction
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          // Add the entry
          const request = store.add({
            ...entry,
            timestamp: entry.timestamp || Date.now()
          });

          request.onsuccess = (event) => {
            const id = (event.target as IDBRequest).result as number;
            const savedEntry = { ...entry, id };

            // Check if we need to trim old entries
            this.trimOldEntries(db);

            observer.next(savedEntry);
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
        console.error('Error saving API call:', error);
        return throwError(() => new Error('Failed to save API call to history'));
      })
    );
  }

  /**
   * Trim old entries if we exceed the maximum number of entries
   */
  private trimOldEntries(db: IDBDatabase): void {
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('timestamp');

    // Count the total number of entries
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const totalEntries = countRequest.result;

      // If we have more entries than the maximum, delete the oldest ones
      if (totalEntries > this.MAX_ENTRIES) {
        // console.log(`Trimming history: ${totalEntries} entries found, limit is ${this.MAX_ENTRIES}`);

        // Get all entries sorted by timestamp (oldest first)
        const getAllRequest = index.getAll();

        getAllRequest.onsuccess = () => {
          const entries = getAllRequest.result as ApiHistoryEntry[];

          // Sort by timestamp (oldest first)
          entries.sort((a, b) => a.timestamp - b.timestamp);

          // Calculate how many entries to delete
          const deleteCount = totalEntries - this.MAX_ENTRIES;

          // Get the entries to delete (the oldest ones)
          const entriesToDelete = entries.slice(0, deleteCount);

          // console.log(`Deleting ${entriesToDelete.length} oldest entries`);

          // Delete the oldest entries
          entriesToDelete.forEach(entry => {
            if (entry.id) {
              store.delete(entry.id);
            }
          });
        };
      }
    };
  }

  /**
   * Get all API call history
   */
  getAllHistory(): Observable<ApiHistoryEntry[]> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiHistoryEntry[]>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.getAll();

          request.onsuccess = (event) => {
            const entries = (event.target as IDBRequest).result as ApiHistoryEntry[];

            // Sort by timestamp (newest first)
            entries.sort((a, b) => b.timestamp - a.timestamp);

            observer.next(entries);
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
        console.error('Error getting API history:', error);
        return of([]);
      })
    );
  }

  /**
   * Get API call history for the current application
   * This is a convenience method that returns the same as getAllHistory
   * since we're now using a separate database for each application
   */
  getHistoryByApplication(applicationName: string): Observable<ApiHistoryEntry[]> {
    // We don't need the applicationName parameter anymore since we're using a separate database
    // But we keep it for backward compatibility
    return this.getAllHistory();
  }

  /**
   * Delete a specific API call from history
   */
  deleteApiCall(id: number): Observable<void> {
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
        console.error('Error deleting API call:', error);
        return throwError(() => new Error('Failed to delete API call from history'));
      })
    );
  }

  /**
   * Clear all API call history for the current application
   */
  clearHistoryForApplication(applicationName: string): Observable<void> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    // We don't need the applicationName parameter anymore since we're using a separate database
    // But we keep it for backward compatibility

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<void>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          // Clear all entries in the store
          const request = store.clear();

          request.onsuccess = () => {
            // console.log(`Cleared all history for database: ${this.dbName}`);
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
        console.error('Error clearing API history:', error);
        return throwError(() => new Error('Failed to clear API history'));
      })
    );
  }

  /**
   * Get a specific API call by ID
   */
  getApiCallById(id: number): Observable<ApiHistoryEntry | null> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiHistoryEntry | null>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.get(id);

          request.onsuccess = (event) => {
            const entry = (event.target as IDBRequest).result as ApiHistoryEntry;
            observer.next(entry || null);
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
        console.error('Error getting API call by ID:', error);
        return of(null);
      })
    );
  }
}
