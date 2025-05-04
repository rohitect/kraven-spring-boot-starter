import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { MockServerConfig, MockServerService, MockConfiguration } from '../../../services/mock-server.service';
import { AndypfJsonViewerComponent } from '../../../components/andypf-json-viewer/andypf-json-viewer.component';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-configuration-management',
  templateUrl: './configuration-management.component.html',
  styleUrls: ['./configuration-management.component.scss'],
  standalone: false
})
export class ConfigurationManagementComponent implements OnChanges, OnInit {
  @Input() serverConfig: MockServerConfig | null = null;

  mockConfiguration: MockConfiguration | null = null;
  configJson: string = '';
  configJsonObject: any = {};
  isDarkTheme = true;

  // UI state
  loading = false;
  error: string | null = null;

  constructor(
    private mockServerService: MockServerService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverConfig'] && this.serverConfig) {
      this.loadMockConfiguration();
    }
  }

  /**
   * Load the mock configuration
   */
  loadMockConfiguration(): void {
    this.loading = true;
    this.mockServerService.getMockConfiguration().subscribe({
      next: (config) => {
        this.mockConfiguration = config;
        this.configJson = JSON.stringify(config, null, 2);

        // Parse the JSON string to an object for the JSON viewer
        try {
          this.configJsonObject = config;
        } catch (e) {
          console.error('Error parsing configuration JSON:', e);
          this.configJsonObject = { error: 'Failed to parse configuration' };
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading mock configuration:', error);
        this.error = 'Failed to load mock configuration';
        this.loading = false;
        this.configJsonObject = { error: 'Failed to load configuration' };
      }
    });
  }

  /**
   * Get the configuration source description
   */
  getConfigSource(): string {
    if (!this.serverConfig) {
      return 'Unknown';
    }

    if (this.serverConfig.configVolumePath) {
      return `File: ${this.serverConfig.configVolumePath}`;
    }

    if (this.serverConfig.configPath) {
      return `Classpath: ${this.serverConfig.configPath}`;
    }

    return 'Default configuration';
  }

  /**
   * Get the total number of endpoints
   */
  getTotalEndpoints(): number {
    return this.mockConfiguration?.endpoints?.length || 0;
  }

  /**
   * Get the total number of responses
   */
  getTotalResponses(): number {
    if (!this.mockConfiguration?.endpoints) {
      return 0;
    }

    return this.mockConfiguration.endpoints.reduce((total, endpoint) => {
      return total + (endpoint.responses?.length || 0);
    }, 0);
  }

  /**
   * Get the configuration summary items
   */
  getConfigSummaryItems(): { label: string, value: string }[] {
    if (!this.serverConfig) {
      return [];
    }

    return [
      { label: 'Enabled', value: this.serverConfig.enabled ? 'Yes' : 'No' },
      { label: 'Auto Start', value: this.serverConfig.autoStart ? 'Yes' : 'No' },
      { label: 'Host', value: this.serverConfig.host },
      { label: 'Port', value: this.serverConfig.port.toString() },
      { label: 'Base Path', value: this.serverConfig.basePath || 'None' },
      { label: 'Auto Reload', value: this.serverConfig.autoReload ? 'Yes' : 'No' },
      { label: 'Reload Interval', value: `${this.serverConfig.reloadIntervalMs}ms` },
      { label: 'Max History Entries', value: this.serverConfig.maxHistoryEntries.toString() },
      { label: 'Default Delay', value: `${this.serverConfig.defaultDelayMs}ms` },
      { label: 'Configuration Source', value: this.getConfigSource() }
    ];
  }

  /**
   * Refresh the configuration
   */
  refreshConfiguration(): void {
    this.loadMockConfiguration();
  }

  /**
   * Get the appropriate icon for a configuration item (legacy method, kept for compatibility)
   */
  getIconForConfigItem(label: string): string {
    return 'fa-' + this.getIconNameForConfigItem(label);
  }

  /**
   * Get the icon name without the fa- prefix
   */
  getIconNameForConfigItem(label: string): string {
    switch (label.toLowerCase()) {
      case 'enabled':
        return 'toggle-on';
      case 'auto start':
        return 'play-circle';
      case 'host':
        return 'server';
      case 'port':
        return 'plug';
      case 'base path':
        return 'sitemap';
      case 'auto reload':
        return 'sync-alt';
      case 'reload interval':
        return 'clock';
      case 'max history entries':
        return 'history';
      case 'default delay':
        return 'hourglass-half';
      case 'configuration source':
        return 'file-code';
      default:
        return 'cog';
    }
  }

  /**
   * Get the HTML entity for an icon based on the label
   */
  getIconHtmlForConfigItem(label: string): string {
    switch (label.toLowerCase()) {
      case 'enabled':
        return '&#xf205;'; // fa-toggle-on
      case 'auto start':
        return '&#xf144;'; // fa-play-circle
      case 'host':
        return '&#xf233;'; // fa-server
      case 'port':
        return '&#xf1e6;'; // fa-plug
      case 'base path':
        return '&#xf0e8;'; // fa-sitemap
      case 'auto reload':
        return '&#xf2f1;'; // fa-sync-alt
      case 'reload interval':
        return '&#xf017;'; // fa-clock
      case 'max history entries':
        return '&#xf1da;'; // fa-history
      case 'default delay':
        return '&#xf252;'; // fa-hourglass-half
      case 'configuration source':
        return '&#xf1c9;'; // fa-file-code
      default:
        return '&#xf013;'; // fa-cog
    }
  }
}
