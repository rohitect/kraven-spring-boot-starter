/**
 * Models for the API History feature
 */

export interface ApiHistoryEntry {
  id?: number;
  applicationName: string;
  path: string;
  method: string;
  timestamp: number;
  request: {
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    pathParams: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
  };
}

export interface ApiHistoryGroup {
  applicationName: string;
  entries: ApiHistoryEntry[];
}
