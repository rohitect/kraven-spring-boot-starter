/**
 * Represents a tab in the API Docs component
 */
export interface ApiTab {
  id: string;
  title: string;
  tagName: string;
  path: string;
  method: string;
  methodType: string;
  createdAt: number;
  lastAccessedAt: number;
  // Tab order for maintaining position in the tab bar
  order: number;
  // Store the endpoint data to avoid having to look it up again
  endpoint?: any;
  // Store the response samples to persist them across refreshes
  responseSamples?: { [code: string]: any };
  // Store the selected response code
  selectedResponseCode?: string | null;
  // Store the active right pane tab
  rightPaneActiveTab?: 'try-it-out' | 'response-samples';
}

/**
 * Represents the state of all tabs for an application
 */
export interface ApiTabsState {
  applicationName: string;
  activeTabId: string | null;
  tabs: ApiTab[];
}
