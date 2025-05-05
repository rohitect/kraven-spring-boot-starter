import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';

@Component({
  selector: 'app-environment-tab',
  templateUrl: './environment-tab.component.html',
  styleUrls: ['./environment-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
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
            return key.toLowerCase().includes(searchTermLower) ||
                  (value.value && value.value.toString().toLowerCase().includes(searchTermLower));
          });

          if (matchingProperties.length > 0) {
            // Create a new properties object with only matching properties
            const filteredProperties: any = {};
            matchingProperties.forEach(([key, value]) => {
              filteredProperties[key] = value;
            });

            // Return a new source object with filtered properties
            return {
              ...source,
              properties: filteredProperties
            };
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
    return source.properties ? Object.keys(source.properties).length : 0;
  }

  getPropertyEntries(properties: any): [string, any][] {
    return Object.entries(properties);
  }

  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }
}
