import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';

// Define node interface for D3 graph
interface GraphNode {
  id: string;
  type: string;
  scope: string;
  level: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface BeanData {
  name: string;
  type: string;
  scope: string;
  resource?: string;
  dependencies?: string[];
}

// Define link interface for D3 graph
interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

// Define D3 node type with our custom properties
type D3Node = d3.SimulationNodeDatum & GraphNode;

// Define D3 link type with our custom properties
type D3Link = d3.SimulationLinkDatum<D3Node> & GraphLink;

@Component({
  selector: 'app-beans-tab',
  templateUrl: './beans-tab.component.html',
  styleUrls: ['./beans-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class BeansTabComponent implements OnInit, AfterViewInit, OnDestroy {
  beansData: any = null;
  allBeans: BeanData[] = [];
  filteredBeans: BeanData[] = [];
  isLoading = true;
  searchTerm: string = '';

  // Filter options
  showSingletons: boolean = true;
  showPrototypes: boolean = true;
  showOtherScopes: boolean = true;

  // View options
  activeView: 'list' | 'graph' = 'list';
  selectedBean: string | null = null;

  // Sorting
  sortField: 'name' | 'type' | 'scope' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Graph options
  graphRootBean: string = '';
  graphShowDependents: boolean = true;
  graphDepthLimit: number = 1; // Changed default depth to 1
  graphSearchTerm: string = '';
  filteredGraphBeans: BeanData[] = [];
  showGraphDropdown: boolean = false;

  private graph: any = null;
  private themeChangeObserver: MutationObserver | null = null;
  private currentTheme: 'light' | 'dark' = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  private subscriptions: Subscription[] = [];
  private resizeTimeout: any = null;

  @ViewChild('dependencyGraph') dependencyGraphElement?: ElementRef;

  // Make document available to the template
  document = document;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadBeansData();

    // Set up theme change detection
    this.setupThemeChangeDetection();

    // Add window resize listener
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Handle window resize events
   */
  private handleResize = (): void => {
    // Debounce resize events
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      if (this.activeView === 'graph' && this.graphRootBean) {
        this.updateGraph();
      }
    }, 250);
  }

  /**
   * Set up theme change detection using MutationObserver
   */
  private setupThemeChangeDetection(): void {
    // Create a MutationObserver to watch for theme changes
    this.themeChangeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
          if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;

            // Recreate the graph if it's active
            if (this.activeView === 'graph' && this.graph) {
              setTimeout(() => {
                this.updateGraph();
              }, 0);
            }
          }
        }
      });
    });

    // Start observing the body element for class changes
    this.themeChangeObserver.observe(document.body, { attributes: true });
  }

  ngAfterViewInit(): void {
    // Initialize the graph if needed
    if (this.activeView === 'graph') {
      this.initializeGraph();
    }
  }

  loadBeansData(): void {
    this.isLoading = true;
    this.actuatorDataService.getBeansData().subscribe({
      next: (data) => {
        if (data) {
          this.beansData = data;
          this.processBeansData();
        } else {
          this.beansData = null;
          this.allBeans = [];
          this.filteredBeans = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading beans data:', error);
        this.isLoading = false;
      }
    });
  }

  processBeansData(): void {
    if (!this.beansData) {
      this.allBeans = [];
      this.filteredBeans = [];
      return;
    }

    // Transform beans data into a more usable format
    this.allBeans = Object.entries(this.beansData.contexts).flatMap(([contextName, contextData]: [string, any]) => {
      return Object.entries(contextData.beans).map(([beanName, beanData]: [string, any]) => {
        return {
          name: beanName,
          type: beanData.type,
          scope: beanData.scope || 'singleton',
          resource: beanData.resource,
          dependencies: beanData.dependencies || []
        };
      });
    });

    // Apply filters
    this.applyFilter();

    // Sort beans
    this.sortBeans(this.sortField);
  }



  forceRefresh(): void {
    this.actuatorDataService.forceRefresh().subscribe({
      next: () => {
        this.loadBeansData();
      },
      error: (error) => {
        console.error('Error forcing refresh:', error);
      }
    });
  }

  applyFilter(): void {
    if (!this.allBeans || this.allBeans.length === 0) {
      this.filteredBeans = [];
      return;
    }

    // Apply search term filter
    let filtered = this.allBeans;
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(bean =>
        bean.name.toLowerCase().includes(searchTermLower) ||
        bean.type.toLowerCase().includes(searchTermLower)
      );
    }

    // Apply scope filters
    filtered = filtered.filter(bean => {
      const scope = bean.scope.toLowerCase();
      if (scope === 'singleton') return this.showSingletons;
      if (scope === 'prototype') return this.showPrototypes;
      return this.showOtherScopes;
    });

    this.filteredBeans = filtered;

    // Update graph if in graph view
    if (this.activeView === 'graph' && this.graph) {
      this.updateGraph();
    }
  }

  sortBeans(field: 'name' | 'type' | 'scope'): void {
    // If clicking the same field, toggle direction
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Sort the beans
    this.filteredBeans.sort((a, b) => {
      let comparison = 0;

      if (field === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (field === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (field === 'scope') {
        comparison = a.scope.localeCompare(b.scope);
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  setActiveView(view: 'list' | 'graph'): void {
    this.activeView = view;

    // Initialize graph if switching to graph view
    if (view === 'graph') {
      // Initialize the filtered graph beans
      this.filterGraphBeans();

      setTimeout(() => {
        this.initializeGraph();
      }, 0);
    }
  }

  // Graph search and dropdown methods
  filterGraphBeans(): void {
    if (!this.allBeans) {
      this.filteredGraphBeans = [];
      return;
    }

    if (!this.graphSearchTerm) {
      this.filteredGraphBeans = [...this.allBeans];
    } else {
      const searchTerm = this.graphSearchTerm.toLowerCase();
      this.filteredGraphBeans = this.allBeans.filter(bean =>
        bean.name.toLowerCase().includes(searchTerm) ||
        bean.type.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by name for better usability
    this.filteredGraphBeans.sort((a, b) => a.name.localeCompare(b.name));
  }

  clearGraphSearch(): void {
    this.graphSearchTerm = '';
    this.filterGraphBeans();
  }

  toggleGraphDropdown(): void {
    this.showGraphDropdown = !this.showGraphDropdown;

    // Add a click outside listener when dropdown is open
    if (this.showGraphDropdown) {
      setTimeout(() => {
        document.addEventListener('click', this.closeDropdownOnClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeDropdownOnClickOutside);
    }
  }

  closeDropdownOnClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.dropdown-container');

    if (dropdown && !dropdown.contains(target)) {
      this.showGraphDropdown = false;
      document.removeEventListener('click', this.closeDropdownOnClickOutside);
      // Need to trigger change detection since this is called outside Angular's zone
      setTimeout(() => {});
    }
  }

  selectGraphBean(beanName: string): void {
    this.graphRootBean = beanName;
    this.showGraphDropdown = false;
    this.updateGraph();
  }

  toggleBeanDetails(beanName: string): void {
    this.selectedBean = this.selectedBean === beanName ? null : beanName;
  }

  selectBean(beanName: string): void {
    this.selectedBean = beanName;

    // If in graph view, update the graph root
    if (this.activeView === 'graph') {
      this.graphRootBean = beanName;
      this.updateGraph();
    }
  }

  getBeanByName(name: string): BeanData | undefined {
    return this.allBeans.find(bean => bean.name === name);
  }

  getBeanDependents(beanName: string): string[] {
    return this.allBeans
      .filter(bean => bean.dependencies && bean.dependencies.includes(beanName))
      .map(bean => bean.name);
  }

  getShortTypeName(type?: string): string {
    if (!type) return 'Unknown';

    // Extract the class name from the fully qualified name
    const parts = type.split('.');
    return parts[parts.length - 1];
  }

  getScopeBadgeClass(scope?: string): string {
    if (!scope) return 'scope-default';

    const scopeLower = scope.toLowerCase();
    if (scopeLower === 'singleton') return 'scope-singleton';
    if (scopeLower === 'prototype') return 'scope-prototype';
    if (scopeLower === 'request') return 'scope-request';
    if (scopeLower === 'session') return 'scope-session';

    return 'scope-other';
  }

  getSingletonCount(): number {
    return this.filteredBeans.filter(bean => bean.scope.toLowerCase() === 'singleton').length;
  }

  getPrototypeCount(): number {
    return this.filteredBeans.filter(bean => bean.scope.toLowerCase() === 'prototype').length;
  }

  getOtherScopesCount(): number {
    return this.filteredBeans.filter(bean =>
      bean.scope.toLowerCase() !== 'singleton' &&
      bean.scope.toLowerCase() !== 'prototype'
    ).length;
  }

  initializeGraph(): void {
    // Initialize D3.js graph
    const element = document.getElementById('dependency-graph');
    if (!element) return;

    // Clear any existing graph
    d3.select('#dependency-graph').selectAll('*').remove();

    // Create SVG element with full container dimensions
    const width = element.clientWidth;
    const height = element.clientHeight || 500;

    const svg = d3.select('#dependency-graph')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add a group for the graph
    this.graph = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.graph.attr('transform', event.transform);
      });

    // Apply zoom to the SVG element with proper typing
    svg.call(zoom as any);

    // Update the graph if a root bean is selected
    if (this.graphRootBean) {
      this.updateGraph();
    }
  }

  updateGraph(): void {
    if (!this.graph || !this.graphRootBean) return;

    // Clear existing graph
    this.graph.selectAll('*').remove();

    // Get the root bean
    const rootBean = this.getBeanByName(this.graphRootBean);
    if (!rootBean) return;

    // Build the graph data
    const nodes: D3Node[] = [];
    const links: D3Link[] = [];

    // Add the root node
    nodes.push({
      id: rootBean.name,
      type: rootBean.type,
      scope: rootBean.scope,
      level: 0
    });

    // Build the graph recursively
    this.buildGraphData(rootBean, nodes, links, 0);

    // Get container dimensions for better centering
    const element = document.getElementById('dependency-graph');
    if (!element) return;

    const width = element.clientWidth;
    const height = element.clientHeight;

    // Create the force simulation with improved forces and increased distances
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id((d: D3Node) => d.id)
        .distance((d: D3Link) => {
          // Get source and target nodes as GraphNode objects
          const source = d.source as D3Node;
          const target = d.target as D3Node;

          // Calculate distance based on node name lengths with significantly increased spacing
          return 300 + (source.id.length + target.id.length) / 4; // Doubled distance
        })
      )
      .force('charge', d3.forceManyBody<D3Node>()
        .strength((d: D3Node) => -1000 - (d.level * 150)) // Much stronger repulsion for all nodes
      )
      .force('center', d3.forceCenter(width / 2, height / 2)) // Center in the container
      .force('x', d3.forceX<D3Node>(width / 2).strength(0.03)) // Reduced strength to allow more spreading
      .force('y', d3.forceY<D3Node>(height / 2).strength(0.03)) // Reduced strength to allow more spreading
      .force('collision', d3.forceCollide<D3Node>().radius(60)); // Increased collision radius to prevent overlap

    // Create link group
    const linkGroup = this.graph.append('g')
      .attr('class', 'links');

    // Create the links with different styles for dependencies and dependents
    const link = linkGroup.selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', (d: D3Link) => `link ${d.type}`)
      .attr('stroke-width', 3) // Further increased stroke width for better visibility
      .attr('stroke', (d: D3Link) => d.type === 'depends' ? '#007bff' : '#dc3545') // Explicitly set stroke color
      .attr('stroke-opacity', 1); // Ensure full opacity

    // Add arrow markers for directed edges with improved visibility
    this.graph.append('defs').selectAll('marker')
      .data(['depends', 'dependent'])
      .enter().append('marker')
      .attr('id', (d: string) => `arrow-${d}`)
      .attr('viewBox', '0 -3 6 6') // Smaller viewBox for smaller arrow
      .attr('refX', 15) // Position the arrow closer to the line end
      .attr('refY', 0)
      .attr('markerWidth', 6) // Further reduced size for the red triangle (dependent)
      .attr('markerHeight', 6) // Further reduced height
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', (d: string) => d === 'depends' ? '#007bff' : '#dc3545')
      .attr('stroke', (d: string) => d === 'depends' ? '#007bff' : '#dc3545') // Add stroke for better visibility
      .attr('stroke-width', 0.5) // Reduced stroke width
      .attr('d', 'M0,-3L6,0L0,3'); // Smaller arrow shape

    // Apply markers to links
    link.attr('marker-end', (d: D3Link) => `url(#arrow-${d.type})`);

    // Create node group
    const nodeGroup = this.graph.append('g')
      .attr('class', 'nodes');

    // Create the nodes with improved styling
    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('data-id', (d: D3Node) => d.id) // Add data attribute for easier selection
      .classed('root-node', (d: D3Node) => d.id === rootBean.name) // Special class for root node
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d: D3Node) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: D3Node) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: D3Node) => {
          if (!event.active) simulation.alphaTarget(0);
          // Keep root node fixed after dragging
          if (d.id === rootBean.name) {
            return;
          }
          d.fx = null;
          d.fy = null;
        }));

    // Add highlight effect for nodes with increased size
    node.append('circle')
      .attr('r', (d: D3Node) => d.id === rootBean.name ? 14 : 10) // Increased radius for better visibility
      .attr('fill', (d: D3Node) => this.getNodeColor(d.scope))
      .attr('stroke', 'white') // Add white stroke for better contrast
      .attr('stroke-width', (d: D3Node) => d.id === rootBean.name ? 3 : 2); // Thicker stroke for root node

    const isDarkTheme = document.body.classList.contains('dark-theme');

    // Add background for text for better visibility (only in dark theme)
    if (isDarkTheme) {
      node.append('rect')
        .attr('class', 'text-background')
        .attr('x', (d: D3Node) => d.id === rootBean.name ? 14 : 10)
        .attr('y', -10)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('height', 20)
        .attr('fill-opacity', 0.9)
        .attr('fill', '#3c3c50')
        .attr('stroke', '#7878aa')
        .attr('stroke-width', 1.5)
        .attr('width', (d: D3Node) => {
          // Calculate width based on text length
          const textLength = this.getShortTypeName(d.id).length;
          return textLength * (d.id === rootBean.name ? 8 : 7) + 10; // Add padding
        });
    }

    // Add labels to the nodes with improved visibility and positioning
    node.append('text')
      .attr('dx', (d: D3Node) => d.id === rootBean.name ? 18 : 14) // Increased spacing to match larger nodes
      .attr('dy', '.35em')
      .attr('font-size', (d: D3Node) => d.id === rootBean.name ? '14px' : '12px') // Larger font for root node
      .attr('font-weight', 'bold')
      .attr('fill', isDarkTheme ? '#ffffff' : null) // Only set explicit fill in dark theme
      .attr('stroke', isDarkTheme ? 'rgba(0, 0, 0, 0.3)' : null) // Add subtle text stroke in dark theme
      .attr('stroke-width', isDarkTheme ? 0.3 : 0) // Very thin stroke for better readability
      .text((d: D3Node) => this.getShortTypeName(d.id));

    // Add detailed tooltip
    node.append('title')
      .text((d: D3Node) => {
        const bean = this.getBeanByName(d.id);
        const dependenciesCount = bean?.dependencies?.length || 0;
        const dependentsCount = this.getBeanDependents(d.id).length;

        return `${d.id}\nType: ${this.getShortTypeName(d.type)}\nScope: ${d.scope}\nDependencies: ${dependenciesCount}\nDependents: ${dependentsCount}`;
      });

    // Add click handler with improved feedback
    node.on('click', (event: MouseEvent, d: D3Node) => {
      // Highlight the clicked node
      nodeGroup.selectAll('.node').classed('selected', false);
      d3.select(event.currentTarget as Element).classed('selected', true);

      this.selectBean(d.id);
      event.stopPropagation(); // Prevent bubbling
    });

    // Add background click handler to deselect
    this.graph.on('click', () => {
      nodeGroup.selectAll('.node').classed('selected', false);
    });

    // Fix the root node position initially
    const rootNode = nodes.find(n => n.id === rootBean.name);
    if (rootNode) {
      rootNode.fx = width / 2;
      rootNode.fy = height / 2;

      // Release after initial stabilization
      setTimeout(() => {
        if (rootNode.fx !== null) {
          rootNode.fx = null;
          rootNode.fy = null;
          simulation.alpha(0.1).restart();
        }
      }, 2000);
    }

    // Update positions on each tick with smoother animation
    simulation.on('tick', () => {
      link
        .attr('x1', (d: D3Link) => {
          const source = d.source as D3Node;
          // Start from the edge of the source node
          const sourceRadius = source.id === rootBean.name ? 12 : 8;
          const target = d.target as D3Node;
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Ensure we're not dividing by zero
          if (dist === 0) return source.x!;

          // Start the line at the edge of the source node
          return source.x! + (dx * sourceRadius / dist);
        })
        .attr('y1', (d: D3Link) => {
          const source = d.source as D3Node;
          // Start from the edge of the source node
          const sourceRadius = source.id === rootBean.name ? 12 : 8;
          const target = d.target as D3Node;
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Ensure we're not dividing by zero
          if (dist === 0) return source.y!;

          // Start the line at the edge of the source node
          return source.y! + (dy * sourceRadius / dist);
        })
        .attr('x2', (d: D3Link) => {
          // Get source and target as D3Node objects
          const source = d.source as D3Node;
          const target = d.target as D3Node;

          // Adjust end position to not overlap with the node
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const targetRadius = target.id === rootBean.name ? 14 : 10; // Increased radius to ensure arrow is visible

          // Ensure we're not dividing by zero
          if (dist === 0) return target.x!;

          return target.x! - (dx * targetRadius / dist);
        })
        .attr('y2', (d: D3Link) => {
          // Get source and target as D3Node objects
          const source = d.source as D3Node;
          const target = d.target as D3Node;

          // Adjust end position to not overlap with the node
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const targetRadius = target.id === rootBean.name ? 14 : 10; // Increased radius to ensure arrow is visible

          // Ensure we're not dividing by zero
          if (dist === 0) return target.y!;

          return target.y! - (dy * targetRadius / dist);
        });

      node
        .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`);
    });

    // Add zoom behavior with improved controls
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.graph.attr('transform', event.transform);
      });

    // Reset zoom on double click
    d3.select('#dependency-graph svg')
      .on('dblclick.zoom', () => {
        d3.select('#dependency-graph svg')
          .transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity);
      });
  }

  buildGraphData(bean: BeanData, nodes: D3Node[], links: D3Link[], level: number): void {
    if (level >= this.graphDepthLimit) return;

    // Add dependencies
    if (bean.dependencies && bean.dependencies.length > 0) {
      for (const depName of bean.dependencies) {
        const depBean = this.getBeanByName(depName);
        if (!depBean) continue;

        // Check if node already exists
        if (!nodes.some(n => n.id === depName)) {
          nodes.push({
            id: depName,
            type: depBean.type,
            scope: depBean.scope,
            level: level + 1
          });

          // Recursively add dependencies
          this.buildGraphData(depBean, nodes, links, level + 1);
        }

        // Add link
        links.push({
          source: bean.name,
          target: depName,
          type: 'depends'
        });
      }
    }

    // Add dependents if enabled
    if (this.graphShowDependents) {
      const dependents = this.getBeanDependents(bean.name);
      for (const depName of dependents) {
        const depBean = this.getBeanByName(depName);
        if (!depBean) continue;

        // Check if node already exists
        if (!nodes.some(n => n.id === depName)) {
          nodes.push({
            id: depName,
            type: depBean.type,
            scope: depBean.scope,
            level: level + 1
          });

          // Don't recursively add dependents to avoid explosion
        }

        // Add link (reversed direction)
        links.push({
          source: depName,
          target: bean.name,
          type: 'dependent'
        });
      }
    }
  }

  getNodeColor(scope: string): string {
    const scopeLower = scope.toLowerCase();
    if (scopeLower === 'singleton') return '#28a745';
    if (scopeLower === 'prototype') return '#007bff';
    if (scopeLower === 'request') return '#fd7e14';
    if (scopeLower === 'session') return '#6f42c1';
    return '#6c757d';
  }

  /**
   * Copy text to clipboard and show a temporary success message
   */
  copyToClipboard(text?: string): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      // Show a temporary success message
      this.showCopySuccessMessage();
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  /**
   * Copy all dependencies of the selected bean to clipboard
   */
  copyAllDependencies(): void {
    if (!this.selectedBean) return;

    const bean = this.getBeanByName(this.selectedBean);
    if (!bean || !bean.dependencies || bean.dependencies.length === 0) return;

    const text = bean.dependencies.join('\n');
    this.copyToClipboard(text);
  }

  /**
   * Copy all dependents of the selected bean to clipboard
   */
  copyAllDependents(): void {
    if (!this.selectedBean) return;

    const dependents = this.getBeanDependents(this.selectedBean);
    if (dependents.length === 0) return;

    const text = dependents.join('\n');
    this.copyToClipboard(text);
  }

  /**
   * Show a temporary success message when text is copied
   * This could be enhanced with a toast notification component
   */
  private showCopySuccessMessage(): void {
    // In a real implementation, you would show a toast notification
    // or some other visual feedback to the user
  }

  /**
   * Clean up resources when component is destroyed
   */
  ngOnDestroy(): void {
    // Disconnect the MutationObserver
    if (this.themeChangeObserver) {
      this.themeChangeObserver.disconnect();
      this.themeChangeObserver = null;
    }

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Remove event listeners
    document.removeEventListener('click', this.closeDropdownOnClickOutside);
    window.removeEventListener('resize', this.handleResize);

    // Clear any pending timeouts
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
  }
}
