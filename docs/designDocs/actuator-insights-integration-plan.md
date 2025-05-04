# Actuator Insights Integration Plan

## Introduction

This document outlines the detailed integration plan for the Actuator Insights feature within the Kraven UI ecosystem. The integration plan focuses on how the feature will be implemented as a plugin, how it will interact with Spring Boot Actuator endpoints, and how it will be presented to users within the Kraven UI interface.

## Plugin Architecture

### Plugin Structure

The Actuator Insights feature will be implemented as a standalone plugin following the established plugin architecture pattern, with the frontend components integrated directly into the main Kraven UI Angular project:

```
plugins/
└── kraven-ui-actuator-insights-plugin/
    ├── src/
    │   ├── main/
    │   │   ├── java/
    │   │   │   └── io/
    │   │   │       └── github/
    │   │   │           └── rohitect/
    │   │   │               └── kraven/
    │   │   │                   └── plugins/
    │   │   │                       └── actuatorinsights/
    │   │   │                           ├── ActuatorInsightsPlugin.java
    │   │   │                           ├── config/
    │   │   │                           ├── controller/
    │   │   │                           ├── model/
    │   │   │                           ├── service/
    │   │   │                           └── util/
    │   │   └── resources/
    │   │       └── META-INF/
    │   │           └── spring.factories
    │   └── test/
    ├── pom.xml
    └── README.md

kraven-ui-frontend/
└── src/
    └── app/
        └── components/
            └── actuator-insights/
                ├── dashboard/
                ├── health/
                ├── metrics/
                ├── environment/
                ├── threads/
                └── shared/
```

### Plugin Registration

The plugin will register itself with the Kraven UI core using the established plugin registration mechanism:

```java
@Component
public class ActuatorInsightsPlugin implements KravenUIPlugin {

    @Override
    public String getName() {
        return "actuator-insights";
    }

    @Override
    public String getDisplayName() {
        return "Actuator Insights";
    }

    @Override
    public String getDescription() {
        return "Interactive visualization and monitoring of Spring Boot Actuator endpoints";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public List<NavigationItem> getNavigationItems() {
        return List.of(
            NavigationItem.builder()
                .id("actuator-insights")
                .label("Actuator Insights")
                .icon("dashboard")
                .path("/actuator-insights")
                .build()
        );
    }
}
```

### Auto-Detection Mechanism

The plugin will include an auto-configuration class that detects the presence of Spring Boot Actuator:

```java
@Configuration
@ConditionalOnClass(Endpoint.class)
@ConditionalOnProperty(
    prefix = "kraven.plugins.actuator-insights",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class ActuatorInsightsAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public ActuatorInsightsProperties actuatorInsightsProperties() {
        return new ActuatorInsightsProperties();
    }

    @Bean
    @ConditionalOnMissingBean
    public ActuatorInsightsService actuatorInsightsService(
            ActuatorInsightsProperties properties,
            WebClient.Builder webClientBuilder) {
        return new ActuatorInsightsService(properties, webClientBuilder);
    }

    // Additional beans...
}
```

## Integration with Spring Boot Actuator

### Endpoint Discovery

The plugin will dynamically discover available actuator endpoints using the following approach:

1. Query the `/actuator` endpoint to get a list of all available endpoints, respecting the servlet context path
2. Consider custom actuator endpoint paths defined in application configuration
3. Filter endpoints based on configuration (include/exclude patterns)
4. Test endpoint accessibility with appropriate authentication
5. Register discovered endpoints for data collection

```java
public class EndpointDiscoveryService {

    private final WebClient webClient;
    private final ActuatorInsightsProperties properties;
    private final Environment environment;

    @Value("${server.servlet.context-path:}")
    private String servletContextPath;

    public Flux<ActuatorEndpoint> discoverEndpoints() {
        // Determine the base actuator path, considering servlet context path
        String actuatorBasePath = getActuatorBasePath();

        return webClient.get()
            .uri(actuatorBasePath)
            .retrieve()
            .bodyToMono(Map.class)
            .flatMapMany(this::extractEndpoints)
            .map(this::applyCustomEndpointPaths)
            .filter(this::isEndpointIncluded)
            .flatMap(this::testEndpointAccess);
    }

    private String getActuatorBasePath() {
        // Get the base path from configuration, defaulting to /actuator
        String configuredPath = environment.getProperty("management.endpoints.web.base-path", "/actuator");

        // Prepend servlet context path if it exists
        return (servletContextPath != null && !servletContextPath.isEmpty())
            ? servletContextPath + configuredPath
            : configuredPath;
    }

    private ActuatorEndpoint applyCustomEndpointPaths(ActuatorEndpoint endpoint) {
        // Check for custom path configuration for this endpoint
        String customPath = environment.getProperty(
            "management.endpoints.web.path-mapping." + endpoint.getId());

        if (customPath != null && !customPath.isEmpty()) {
            return endpoint.withPath(customPath);
        }

        return endpoint;
    }

    // Additional implementation details...
}
```

### Data Collection Strategy

The plugin will implement a flexible data collection strategy:

1. **Polling**: Regular polling for endpoints that don't change frequently
   - Polling intervals configurable directly from the UI
   - Application-specific polling interval settings
   - Default intervals optimized for each endpoint type
2. **Event-Based**: WebSocket or SSE for real-time updates when supported
3. **On-Demand**: User-triggered data collection for resource-intensive endpoints

```java
public class DataCollectionService {

    private final Map<String, Flux<ActuatorData>> dataStreams = new ConcurrentHashMap<>();
    private final EndpointDiscoveryService discoveryService;
    private final WebClient webClient;
    private final ApplicationEventPublisher eventPublisher;

    // Map to store application-specific polling intervals
    private final Map<String, Map<String, Duration>> applicationPollingIntervals = new ConcurrentHashMap<>();

    public Flux<ActuatorData> getDataStream(String applicationName, String endpointId) {
        String streamKey = getStreamKey(applicationName, endpointId);
        return dataStreams.computeIfAbsent(streamKey, k -> createDataStream(applicationName, endpointId));
    }

    public void updatePollingInterval(String applicationName, String endpointId, Duration interval) {
        // Store the new interval
        applicationPollingIntervals
            .computeIfAbsent(applicationName, k -> new ConcurrentHashMap<>())
            .put(endpointId, interval);

        // Recreate the data stream with the new interval
        String streamKey = getStreamKey(applicationName, endpointId);
        dataStreams.remove(streamKey); // Remove existing stream
        dataStreams.computeIfAbsent(streamKey, k -> createDataStream(applicationName, endpointId));

        // Publish event for UI notification
        eventPublisher.publishEvent(new PollingIntervalChangedEvent(applicationName, endpointId, interval));
    }

    private String getStreamKey(String applicationName, String endpointId) {
        return applicationName + ":" + endpointId;
    }

    private Flux<ActuatorData> createDataStream(String applicationName, String endpointId) {
        ActuatorEndpoint endpoint = discoveryService.getEndpoint(applicationName, endpointId);

        switch (endpoint.getCollectionStrategy()) {
            case POLLING:
                return createPollingStream(applicationName, endpoint);
            case EVENT_BASED:
                return createEventBasedStream(applicationName, endpoint);
            case ON_DEMAND:
                return createOnDemandStream(applicationName, endpoint);
            default:
                throw new IllegalStateException("Unknown collection strategy");
        }
    }

    private Flux<ActuatorData> createPollingStream(String applicationName, ActuatorEndpoint endpoint) {
        // Get application-specific polling interval or use default
        Duration interval = applicationPollingIntervals
            .getOrDefault(applicationName, Collections.emptyMap())
            .getOrDefault(endpoint.getId(), getDefaultInterval(endpoint.getId()));

        return Flux.interval(interval)
            .flatMap(tick -> fetchEndpointData(applicationName, endpoint))
            .share();
    }

    private Duration getDefaultInterval(String endpointId) {
        // Return optimized default intervals based on endpoint type
        switch (endpointId) {
            case "health":
                return Duration.ofSeconds(10);
            case "metrics":
                return Duration.ofSeconds(5);
            case "env":
            case "beans":
                return Duration.ofMinutes(1);
            default:
                return Duration.ofSeconds(15);
        }
    }

    // Additional implementation details...
}
```

### Data Processing and Transformation

Raw actuator data will be processed and transformed into visualization-friendly formats:

```java
public class DataTransformationService {

    public <T> VisualData transformData(String endpointId, T rawData) {
        switch (endpointId) {
            case "health":
                return transformHealthData((Map<String, Object>) rawData);
            case "metrics":
                return transformMetricsData((Map<String, Object>) rawData);
            case "beans":
                return transformBeansData((Map<String, Object>) rawData);
            // Other transformations...
            default:
                return new GenericVisualData(rawData);
        }
    }

    // Specific transformation methods...
}
```

## UI Integration

### Navigation Integration

The Actuator Insights feature will be integrated into the Kraven UI navigation system:

```typescript
// actuator-insights-routing.module.ts
const routes: Routes = [
  {
    path: 'actuator-insights',
    component: ActuatorInsightsComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'health', component: HealthComponent },
      { path: 'metrics', component: MetricsComponent },
      // Additional routes...
    ]
  }
];
```

### Dashboard Layout

The main dashboard will use a flexible grid layout system:

```typescript
// dashboard.component.ts
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dashboardLayout: GridsterConfig;
  dashboardItems: Array<GridsterItem>;

  ngOnInit() {
    this.initializeDashboard();
    this.loadSavedLayout();
  }

  private initializeDashboard() {
    this.dashboardLayout = {
      draggable: { enabled: true },
      resizable: { enabled: true },
      pushItems: true,
      minCols: 6,
      maxCols: 12,
      minRows: 6,
      fixedRowHeight: 200,
      mobileBreakpoint: 800
    };
  }

  // Additional methods...
}
```

### Visualization Components

The plugin will include a rich set of visualization components:

```typescript
// health-status.component.ts
@Component({
  selector: 'app-health-status',
  templateUrl: './health-status.component.html',
  styleUrls: ['./health-status.component.scss'],
  animations: [
    trigger('healthState', [
      state('UP', style({ backgroundColor: '#4caf50' })),
      state('DOWN', style({ backgroundColor: '#f44336' })),
      state('UNKNOWN', style({ backgroundColor: '#9e9e9e' })),
      transition('* => *', animate('300ms ease-in-out'))
    ])
  ]
})
export class HealthStatusComponent implements OnInit {
  @Input() healthData: any;

  // Component implementation...
}
```

### Real-Time Updates

The UI will support real-time updates using WebSocket or polling:

```typescript
// metrics-chart.component.ts
@Component({
  selector: 'app-metrics-chart',
  templateUrl: './metrics-chart.component.html',
  styleUrls: ['./metrics-chart.component.scss']
})
export class MetricsChartComponent implements OnInit, OnDestroy {
  @Input() metricName: string;

  private dataSubscription: Subscription;
  chartData: any[] = [];
  chartOptions: any;

  constructor(private metricsService: MetricsService) {}

  ngOnInit() {
    this.initializeChart();
    this.subscribeToMetricUpdates();
  }

  private subscribeToMetricUpdates() {
    this.dataSubscription = this.metricsService
      .getMetricStream(this.metricName)
      .pipe(
        map(data => this.transformForChart(data)),
        throttleTime(1000)
      )
      .subscribe(data => {
        this.updateChart(data);
      });
  }

  // Additional methods...

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}
```

## Data Flow Architecture

### End-to-End Data Flow

The complete data flow from Spring Boot Actuator to the UI visualization:

1. **Discovery**: Endpoint discovery service identifies available actuator endpoints
2. **Collection**: Data collection service retrieves data from endpoints
3. **Processing**: Raw data is transformed into visualization-friendly formats
4. **Storage**: Data is stored in memory or persistent storage for historical analysis
5. **Streaming**: Processed data is streamed to the UI via WebSocket or HTTP
6. **Visualization**: UI components render the data using appropriate visualizations
7. **Interaction**: User interactions trigger additional data requests or transformations

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Spring Boot    │     │  Actuator       │     │  Kraven UI      │
│  Application    │     │  Insights       │     │  Frontend       │
│                 │     │  Plugin         │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │ Actuator  │  │     │  │ Data      │  │     │  │ Dashboard │  │
│  │ Endpoints │◄─┼─────┼──┤ Collection│◄─┼─────┼──┤ Components│  │
│  └───────────┘  │     │  └───────────┘  │     │  └───────────┘  │
│                 │     │        │        │     │        ▲        │
│                 │     │        ▼        │     │        │        │
│                 │     │  ┌───────────┐  │     │  ┌───────────┐  │
│                 │     │  │ Data      │  │     │  │ Data      │  │
│                 │     │  │ Processing│  │     │  │ Services  │  │
│                 │     │  └───────────┘  │     │  └───────────┘  │
│                 │     │        │        │     │        ▲        │
│                 │     │        ▼        │     │        │        │
│                 │     │  ┌───────────┐  │     │  ┌───────────┐  │
│                 │     │  │ API       │◄─┼─────┼──┤ HTTP/WS   │  │
│                 │     │  │ Endpoints │  │     │  │ Clients   │  │
│                 │     │  └───────────┘  │     │  └───────────┘  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Data Storage Strategy

The plugin will implement a tiered storage strategy:

1. **In-Memory Cache**: Recent data for fast access
2. **Time-Series Database**: Historical data with automatic aggregation
3. **Local Storage**: User preferences and dashboard configurations

```java
public class DataStorageService {

    private final Cache<String, ActuatorData> recentDataCache;
    private final TimeSeriesRepository timeSeriesRepository;

    public void storeData(String endpointId, ActuatorData data) {
        // Store in recent cache
        recentDataCache.put(endpointId, data);

        // Store in time series DB if applicable
        if (isTimeSeriesData(data)) {
            timeSeriesRepository.store(endpointId, data);
        }
    }

    public Flux<ActuatorData> getHistoricalData(String endpointId, Duration timeRange) {
        return timeSeriesRepository.query(endpointId, timeRange);
    }

    // Additional methods...
}
```

## Security Considerations

### Sensitive Data Handling

The plugin will implement safeguards for sensitive data:

1. Mask sensitive information in environment properties
2. Provide controlled access to sensitive endpoints
3. Implement audit logging for sensitive operations

```java
public class SensitiveDataHandler {

    private final Set<String> sensitivePatterns = Set.of(
        "password", "secret", "key", "token", "credential"
    );

    public Object maskSensitiveData(Object data) {
        if (data instanceof Map) {
            return maskMap((Map<String, Object>) data);
        } else if (data instanceof List) {
            return maskList((List<Object>) data);
        } else if (data instanceof String) {
            return maskIfSensitive((String) data);
        }
        return data;
    }

    // Implementation details...
}
```

## Configuration Options

### Plugin Configuration

The plugin will support comprehensive configuration options:

```java
@ConfigurationProperties(prefix = "kraven.plugins.actuator-insights")
public class ActuatorInsightsProperties {

    /**
     * Whether the Actuator Insights plugin is enabled.
     */
    private boolean enabled = true;

    /**
     * Whether to automatically detect and connect to actuator endpoints.
     */
    private boolean autoDetect = true;

    /**
     * Data collection configuration.
     */
    private DataCollection dataCollection = new DataCollection();

    /**
     * Endpoint inclusion/exclusion configuration.
     */
    private Endpoints endpoints = new Endpoints();

    /**
     * Alert configuration.
     */
    private Alerts alerts = new Alerts();

    // Nested configuration classes...

    public static class DataCollection {
        /**
         * Default data collection interval.
         */
        private Duration interval = Duration.ofSeconds(15);

        /**
         * Data retention period.
         */
        private Duration retentionPeriod = Duration.ofHours(1);

        // Getters and setters...
    }

    public static class Endpoints {
        /**
         * Patterns of endpoints to include.
         */
        private List<String> include = List.of("*");

        /**
         * Patterns of endpoints to exclude.
         */
        private List<String> exclude = List.of("heapdump", "shutdown");

        // Getters and setters...
    }

    public static class Alerts {
        /**
         * Whether alerts are enabled.
         */
        private boolean enabled = true;

        /**
         * Alert thresholds.
         */
        private Map<String, Double> thresholds = new HashMap<>();

        // Getters and setters...
    }

    // Additional nested classes...
}
```

### User Preferences

The UI will store application-specific user preferences in the browser's local storage, with the polling interval configurable directly from the UI:

```typescript
// user-preferences.service.ts
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY_PREFIX = 'actuator-insights-preferences-';

  savePreferences(applicationName: string, preferences: UserPreferences): void {
    const storageKey = this.getStorageKey(applicationName);
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  }

  getPreferences(applicationName: string): UserPreferences {
    const storageKey = this.getStorageKey(applicationName);
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : this.getDefaultPreferences();
  }

  private getStorageKey(applicationName: string): string {
    // Sanitize application name to ensure valid storage key
    const sanitizedAppName = applicationName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${this.STORAGE_KEY_PREFIX}${sanitizedAppName}`;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      refreshInterval: 5000, // User can modify this from the UI
      dashboardLayout: 'default',
      expandedSections: [],
      visibleMetrics: ['jvm.memory.used', 'http.server.requests', 'system.cpu.usage']
    };
  }
}

// In the UI component that controls refresh interval
@Component({
  selector: 'app-refresh-interval-control',
  template: `
    <div class="refresh-control">
      <label>Refresh Interval:</label>
      <select [ngModel]="currentInterval" (ngModelChange)="updateInterval($event)">
        <option [value]="2000">2 seconds</option>
        <option [value]="5000">5 seconds</option>
        <option [value]="10000">10 seconds</option>
        <option [value]="30000">30 seconds</option>
        <option [value]="60000">1 minute</option>
        <option [value]="300000">5 minutes</option>
      </select>
    </div>
  `
})
export class RefreshIntervalControlComponent implements OnInit {
  @Input() applicationName: string;
  currentInterval: number;

  constructor(private preferencesService: UserPreferencesService) {}

  ngOnInit() {
    const prefs = this.preferencesService.getPreferences(this.applicationName);
    this.currentInterval = prefs.refreshInterval;
  }

  updateInterval(newInterval: number) {
    this.currentInterval = newInterval;
    const prefs = this.preferencesService.getPreferences(this.applicationName);
    prefs.refreshInterval = newInterval;
    this.preferencesService.savePreferences(this.applicationName, prefs);

    // Emit event to notify data services about the interval change
    // This will trigger the data services to adjust their polling intervals
  }
}
```

## Testing Strategy

### Unit Testing

The plugin will include comprehensive unit tests:

```java
@ExtendWith(MockitoExtension.class)
class ActuatorDataServiceTest {

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private ActuatorDataService actuatorDataService;

    @BeforeEach
    void setUp() {
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    }

    @Test
    void shouldFetchHealthData() {
        // Test implementation...
    }

    // Additional tests...
}
```

### Integration Testing

Integration tests will verify the end-to-end functionality:

```java
@SpringBootTest
@AutoConfigureMockMvc
class ActuatorInsightsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnActuatorEndpoints() throws Exception {
        mockMvc.perform(get("/kraven/plugin/actuator-insights/endpoints"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].id").exists());
    }

    // Additional tests...
}
```

### UI Testing

UI components will be tested using Angular testing tools:

```typescript
// health-status.component.spec.ts
describe('HealthStatusComponent', () => {
  let component: HealthStatusComponent;
  let fixture: ComponentFixture<HealthStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthStatusComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HealthStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct status color', () => {
    component.healthData = { status: 'UP' };
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('.health-indicator');
    expect(element.classList).toContain('status-up');
  });

  // Additional tests...
});
```

## Deployment and Release Strategy

### Versioning

The plugin will follow semantic versioning:

- **Major version**: Incompatible API changes
- **Minor version**: New features in a backward-compatible manner
- **Patch version**: Backward-compatible bug fixes

### Release Process

1. **Development**: Feature development in feature branches
2. **Testing**: Comprehensive testing in a staging environment
3. **Documentation**: Update documentation and release notes
4. **Release**: Create release artifacts and update version
5. **Deployment**: Publish to Maven Central and update documentation

### Compatibility Matrix

The plugin will maintain compatibility with:

| Actuator Insights Version | Spring Boot Version | Kraven UI Version |
|---------------------------|---------------------|-------------------|
| 1.0.x                     | 2.7.x - 3.0.x       | 1.0.x             |
| 1.1.x                     | 3.0.x - 3.1.x       | 1.1.x             |

## Monitoring and Feedback

### Usage Analytics

The plugin will collect anonymous usage statistics:

- Most frequently used visualizations
- Average session duration
- Feature utilization rates
- Error occurrences

### Feedback Mechanism

Users will be able to provide feedback directly from the UI:

- Feature request submission
- Bug reporting
- Satisfaction ratings
- Suggestion box

## Conclusion

The Actuator Insights integration plan provides a comprehensive roadmap for implementing a powerful, user-friendly visualization layer on top of Spring Boot Actuator. By following this plan, we will deliver a feature that significantly enhances the developer experience and provides valuable insights into Spring Boot applications.

The plugin architecture ensures that the feature can be easily integrated into existing projects while maintaining compatibility with the core Kraven UI framework. The phased implementation approach allows for incremental delivery of value while ensuring a solid foundation for future enhancements.
