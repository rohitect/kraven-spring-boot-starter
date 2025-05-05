import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';
import { HighlightSearchPipe } from '../../../pipes/highlight-search.pipe';

@Component({
  selector: 'app-environment-tab',
  templateUrl: './environment-tab.component.html',
  styleUrls: ['./environment-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighlightSearchPipe
  ]
})
export class EnvironmentTabComponent implements OnInit {
  envData: any = null;
  infoData: any = null;
  isLoading = true;
  searchTerm: string = '';
  filteredEnvData: any = null;
  activeSection: string | null = null;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadEnvironmentData();
  }

  loadEnvironmentData(): void {
    this.isLoading = true;

    // Load environment data
    this.actuatorDataService.getEnvironmentData().subscribe({
      next: (data) => {
        this.envData = data || null;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading environment data:', error);
        this.isLoading = false;
      }
    });

    // Load info data
    this.actuatorDataService.getInfoData().subscribe({
      next: (data) => {
        this.infoData = data || null;
      },
      error: (error) => {
        console.error('Error loading info data:', error);
      }
    });
  }

  forceRefresh(): void {
    this.actuatorDataService.forceRefresh().subscribe({
      next: () => {
        this.loadEnvironmentData();
      },
      error: (error) => {
        console.error('Error forcing refresh:', error);
      }
    });
  }

  applyFilter(): void {
    if (!this.envData) {
      this.filteredEnvData = null;
      return;
    }

    if (!this.searchTerm) {
      this.filteredEnvData = this.envData;
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();

    // Filter the environment data
    this.filteredEnvData = {
      activeProfiles: this.envData.activeProfiles,
      propertySources: this.envData.propertySources.filter((source: any) => {
        // Check if the source name matches
        if (source.name.toLowerCase().includes(searchTermLower)) {
          return true;
        }

        // Check if any property matches
        if (source.properties) {
          const matchingProperties = Object.entries(source.properties).filter(([key, value]: [string, any]) => {
            // Check if key contains search term
            if (key.toLowerCase().includes(searchTermLower)) {
              return true;
            }

            // Check if value contains search term
            if (value.value) {
              // Handle different value types
              if (typeof value.value === 'object') {
                // For objects, convert to JSON string and search
                const jsonString = JSON.stringify(value.value).toLowerCase();
                return jsonString.includes(searchTermLower);
              } else {
                // For primitive values, convert to string and search
                return value.value.toString().toLowerCase().includes(searchTermLower);
              }
            }

            return false;
          });

          // If any property matches, return the source with all properties
          // The individual property rows will be filtered in getPropertyEntries
          if (matchingProperties.length > 0) {
            return true;
          }
        }

        return false;
      })
    };
  }

  toggleSection(section: string): void {
    this.activeSection = this.activeSection === section ? null : section;
  }

  isSectionActive(section: string): boolean {
    return this.activeSection === section;
  }

  getPropertyCount(source: any): number {
    if (!source.properties) {
      return 0;
    }

    // If there's a search term, count only the matching properties
    if (this.searchTerm) {
      return this.getPropertyEntries(source.properties).length;
    }

    // Otherwise, return the total count
    return Object.keys(source.properties).length;
  }

  getPropertyEntries(properties: any): [string, any][] {
    if (!this.searchTerm) {
      return Object.entries(properties);
    }

    // If there's a search term, filter the properties to only show matching ones
    const searchTermLower = this.searchTerm.toLowerCase();
    return Object.entries(properties).filter(([key, value]: [string, any]) => {
      // Check if key contains search term
      if (key.toLowerCase().includes(searchTermLower)) {
        return true;
      }

      // Check if value contains search term
      if (value.value) {
        // Handle different value types
        if (typeof value.value === 'object') {
          // For objects, convert to JSON string and search
          const jsonString = JSON.stringify(value.value).toLowerCase();
          return jsonString.includes(searchTermLower);
        } else {
          // For primitive values, convert to string and search
          return value.value.toString().toLowerCase().includes(searchTermLower);
        }
      }

      return false;
    });
  }

  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }

  getTotalPropertyCount(source: any): number {
    return source.properties ? Object.keys(source.properties).length : 0;
  }
}
