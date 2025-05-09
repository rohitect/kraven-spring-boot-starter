import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiFavorite } from '../models/api-favorite.model';

@Injectable({
  providedIn: 'root'
})
export class ApiFavoritesService {
  private readonly STORE_NAME = 'api-favorites';
  private readonly DB_VERSION = 1;
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

    this.dbName = `${sanitizedName}-kraven-api-favorites`;
    // console.log(`Using favorites database: ${this.dbName}`);

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
        store.createIndex('path', 'path', { unique: false });
        store.createIndex('method', 'method', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onerror = (event) => {
      console.error(`Error opening IndexedDB ${this.dbName}:`, (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = () => {
      // console.log(`Successfully opened favorites database: ${this.dbName}`);
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
   * Get all favorites
   */
  getAllFavorites(): Observable<ApiFavorite[]> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiFavorite[]>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.getAll();

          request.onsuccess = (event) => {
            const favorites = (event.target as IDBRequest).result as ApiFavorite[];
            
            // Sort by created date (newest first)
            favorites.sort((a, b) => b.createdAt - a.createdAt);
            
            observer.next(favorites);
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
        console.error('Error getting favorites:', error);
        return of([]);
      })
    );
  }

  /**
   * Check if an endpoint is a favorite
   */
  isFavorite(path: string, method: string): Observable<boolean> {
    return this.getAllFavorites().pipe(
      map(favorites => favorites.some(f => f.path === path && f.method === method))
    );
  }

  /**
   * Add an endpoint to favorites
   */
  addFavorite(endpoint: any, tagName: string): Observable<ApiFavorite> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    // Generate a unique ID for the favorite
    const id = `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the favorite object
    const favorite: ApiFavorite = {
      id,
      path: endpoint.path,
      method: endpoint.method.type,
      methodType: endpoint.method.type.toLowerCase(),
      title: endpoint.method.operation.summary || this.getShortPath(endpoint.path),
      tagName,
      createdAt: Date.now(),
      endpoint: this.cleanEndpointForStorage(endpoint)
    };

    return from(this.getDatabase()).pipe(
      switchMap(db => {
        return new Observable<ApiFavorite>(observer => {
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.add(favorite);

          request.onsuccess = () => {
            observer.next(favorite);
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
        console.error('Error adding favorite:', error);
        return throwError(() => new Error('Failed to add favorite'));
      })
    );
  }

  /**
   * Remove an endpoint from favorites
   */
  removeFavorite(path: string, method: string): Observable<void> {
    if (!this.dbName) {
      return throwError(() => new Error('Database name not set. Call setApplicationName first.'));
    }

    // First find the favorite with the matching path and method
    return this.getAllFavorites().pipe(
      switchMap(favorites => {
        const favorite = favorites.find(f => f.path === path && f.method === method);
        if (!favorite) {
          return throwError(() => new Error('Favorite not found'));
        }

        // Then delete it by ID
        return from(this.getDatabase()).pipe(
          switchMap(db => {
            return new Observable<void>(observer => {
              const transaction = db.transaction([this.STORE_NAME], 'readwrite');
              const store = transaction.objectStore(this.STORE_NAME);

              const request = store.delete(favorite.id);

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
          })
        );
      }),
      catchError(error => {
        console.error('Error removing favorite:', error);
        return throwError(() => new Error('Failed to remove favorite'));
      })
    );
  }

  /**
   * Clean up favorites that no longer exist in the API endpoints
   */
  cleanupFavorites(endpoints: any[]): Observable<void> {
    return this.getAllFavorites().pipe(
      switchMap(favorites => {
        // Find favorites that no longer exist in the endpoints
        const toRemove = favorites.filter(favorite => {
          return !endpoints.some(endpoint => 
            endpoint.path === favorite.path && 
            endpoint.method.type === favorite.method
          );
        });

        if (toRemove.length === 0) {
          return of(void 0);
        }

        // Remove each favorite that no longer exists
        return from(this.getDatabase()).pipe(
          switchMap(db => {
            return new Observable<void>(observer => {
              const transaction = db.transaction([this.STORE_NAME], 'readwrite');
              const store = transaction.objectStore(this.STORE_NAME);

              let completed = 0;
              let errors = 0;

              toRemove.forEach(favorite => {
                const request = store.delete(favorite.id);

                request.onsuccess = () => {
                  completed++;
                  if (completed + errors === toRemove.length) {
                    observer.next();
                    observer.complete();
                  }
                };

                request.onerror = () => {
                  errors++;
                  if (completed + errors === toRemove.length) {
                    observer.next();
                    observer.complete();
                  }
                };
              });

              // Close the database when the transaction is complete
              transaction.oncomplete = () => db.close();

              return {
                unsubscribe: () => {
                  // Nothing to clean up
                }
              };
            });
          })
        );
      }),
      catchError(error => {
        console.error('Error cleaning up favorites:', error);
        return of(void 0);
      })
    );
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
