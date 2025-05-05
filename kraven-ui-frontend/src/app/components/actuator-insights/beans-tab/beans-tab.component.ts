import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActuatorDataService } from '../services/actuator-data.service';
import * as d3 from 'd3';

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
export class BeansTabComponent implements OnInit, AfterViewInit {
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
  graphDepthLimit: number = 2;

  private graph: any = null;

  @ViewChild('dependencyGraph') dependencyGraphElement?: ElementRef;

  constructor(private actuatorDataService: ActuatorDataService) {}

  ngOnInit(): void {
    // Load initial data
    this.loadBeansData();
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
      setTimeout(() => {
        this.initializeGraph();
      }, 0);
    }
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

  getShortTypeName(type: string): string {
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

    // Create SVG element
    const width = element.clientWidth;
    const height = element.clientHeight || 500;

    const svg = d3.select('#dependency-graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

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
    const nodes: GraphNode[] = [];
    const links: {source: string, target: string, type: string}[] = [];

    // Add the root node
    nodes.push({
      id: rootBean.name,
      type: rootBean.type,
      scope: rootBean.scope,
      level: 0
    });

    // Build the graph recursively
    this.buildGraphData(rootBean, nodes, links, 0);

    // Create the force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(400, 300))
      .force('x', d3.forceX())
      .force('y', d3.forceY());

    // Create the links
    const link = this.graph.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Create the nodes
    const node = this.graph.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d: GraphNode) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: GraphNode) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: GraphNode) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // Add circles to the nodes
    node.append('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => this.getNodeColor(d.scope));

    // Add labels to the nodes
    node.append('text')
      .attr('dx', 12)
      .attr('dy', '.35em')
      .text((d: any) => d.id);

    // Add title for tooltip
    node.append('title')
      .text((d: any) => `${d.id}\nType: ${this.getShortTypeName(d.type)}\nScope: ${d.scope}`);

    // Add click handler
    node.on('click', (event: any, d: any) => {
      this.selectBean(d.id);
    });

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  buildGraphData(bean: BeanData, nodes: GraphNode[], links: {source: string, target: string, type: string}[], level: number): void {
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
}
