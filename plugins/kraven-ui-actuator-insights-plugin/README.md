# 📊 Kraven UI Actuator Insights Plugin

A powerful Spring Boot Actuator visualization and monitoring plugin for Kraven UI.

## 🌟 Features

- **Real-time visualization** of application health, performance metrics, and system resources
- **Interactive exploration** of application internals (beans, environment, configurations)
- **Historical data analysis** to identify trends and potential issues
- **Smart auto-detection** of Spring Boot Actuator in your application (by class, bean, or endpoint)
- **Comprehensive thread analysis** with state distribution, deadlock detection, and thread pool insights
- **Advanced environment visualization** with property source exploration and search highlighting
- **Auto-configuration analysis** with detailed conditions evaluation reporting
- **Customizable dashboard** with various visualization options and auto-refresh controls

## 🔧 Installation

The Actuator Insights plugin is automatically included with Kraven UI. No additional installation is required.

## ⚙️ Configuration

Configure the plugin using your application's `application.yml` or environment variables:

```yaml
kraven:
  plugins:
    actuator-insights:
      enabled: true
      auto-detect: true
      base-url: "http://localhost:8080"
      context-path: ""
      data-collection:
        interval: 15s
        retention-period: 1h
      endpoints:
        include: "*"
        exclude: "heapdump,shutdown"
      sensitive-data:
        mask-sensitive-values: true
        sensitive-patterns: "password,passwd,secret,credential,token,key,auth,private,access"
```

> **Note:** The plugin will automatically use the application's actual port from `server.port` and context path from either `server.servlet.context-path` or `spring.mvc.servlet.path` if they are configured in your Spring Boot application. The `base-url` and `context-path` settings above are only used as fallbacks.

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable or disable the plugin | `true` |
| `auto-detect` | Automatically detect Spring Boot Actuator | `true` |
| `base-url` | Base URL for actuator endpoints (overridden by server.port if available) | `http://localhost:8080` |
| `context-path` | Servlet context path of the application (overridden by server.servlet.context-path or spring.mvc.servlet.path if available) | `""` (empty) |
| `data-collection.interval` | Interval for collecting data | `15s` |
| `data-collection.retention-period` | Period to retain historical data | `1h` |
| `endpoints.include` | Endpoints to include (comma-separated or "*" for all) | `*` |
| `endpoints.exclude` | Endpoints to exclude (comma-separated) | `heapdump,shutdown` |
| `sensitive-data.mask-sensitive-values` | Whether to mask sensitive values in environment properties | `true` |
| `sensitive-data.sensitive-patterns` | Comma-separated list of patterns to consider sensitive | `password,passwd,secret,credential,token,key,auth,private,access` |

## 🚀 Usage

1. **Access the Dashboard**: Navigate to the "Actuator Insights" section in the Kraven UI
2. **View Health Status**: See the current health of your application and its components with real-time updates
3. **Monitor Metrics**: View real-time metrics with historical trends and customizable charts
4. **Explore Environment**: Examine your application's environment properties with advanced search and filtering
   - Search across all property sources with highlighted results
   - View active profiles and application info
   - Explore property sources with collapsible sections
5. **Analyze Beans**: Explore your application's bean definitions and dependencies
6. **Analyze Threads**: Comprehensive thread analysis with multiple visualization options
   - View thread state distribution with color-coded indicators
   - Detect deadlocks and lock contention issues
   - Analyze thread pools (Tomcat, HikariCP, Kafka, etc.)
   - Identify CPU-intensive threads and potential memory leaks
   - Generate detailed thread analysis reports
7. **Explore Conditions**: Understand Spring Boot auto-configuration decisions
   - View positive matches (configurations that were applied)
   - Examine negative matches (configurations that were skipped and why)
   - See unconditional classes (configurations always applied)
   - Search across all conditions with highlighted results
   - Navigate easily with fixed secondary tabs

### Environment Tab Features

The Environment tab provides a comprehensive view of your application's configuration:

#### Advanced Search and Filtering
- Search across all property sources with real-time highlighting
- Filter property sources to show only matching properties
- Collapsible sections for easy navigation of large configuration sets

#### Property Source Visualization
- Hierarchical view of all property sources with property counts
- Origin tracking for each property (where it was defined)
- Special formatting for different value types (strings, numbers, objects, arrays)

#### Active Profiles and Application Info
- Visual display of active Spring profiles
- Detailed application information from the info endpoint
- Automatic refresh on demand

#### Spring Boot Masking

In Spring Boot 3, all environment property values are masked by default in the `/env` endpoint for security reasons. If you want to display the actual values, you need to add the following configuration to your application:

```yaml
management:
  endpoint:
    env:
      show-values: always
```

Alternatively, you can set it to `when-authorized` to only show values to authenticated users with appropriate roles.

#### Plugin Sensitive Value Masking

The Actuator Insights plugin provides an additional layer of security by masking sensitive values in environment properties. This is enabled by default and can be configured using the `sensitive-data` configuration options.

The plugin will mask values for properties whose keys contain any of the configured sensitive patterns (e.g., "password", "secret", "token", etc.). You can customize the list of sensitive patterns or disable masking entirely if needed.

This feature is particularly useful when:
- You want to display most environment values but mask sensitive ones
- You're using Spring Boot 2.x which doesn't have built-in masking
- You need more fine-grained control over which values are masked

### Thread Analysis

The Thread Analysis tab provides comprehensive insights into your application's thread usage and potential concurrency issues:

#### Thread State Visualization
- Color-coded thread state distribution (RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED)
- Interactive thread list filtered by state
- Detailed thread stack trace viewer

#### Thread Analysis Types
The plugin offers multiple analysis types to help diagnose different issues:

| Analysis Type | Description |
|---------------|-------------|
| State Distribution | Overview of thread states with percentages |
| Deadlock Detection | Identifies circular dependencies between threads |
| Lock Contention | Finds locks with multiple waiting threads |
| Thread Pool Analysis | Groups threads by common pools (Tomcat, HikariCP, etc.) |
| Stack Trace Patterns | Identifies common patterns in thread stack traces |
| Thread Grouping | Groups threads by naming patterns |
| CPU-Intensive Threads | Identifies threads likely consuming CPU resources |
| Memory Leak Indicators | Finds potential memory leak indicators |
| Comprehensive | Combines all analyses into a single report |

#### Report Generation
Generate detailed PDF reports of thread analysis results for sharing or documentation.

### Conditions Report Features

The Conditions Report tab provides insights into Spring Boot's auto-configuration decisions:

#### Auto-Configuration Analysis
- Understand why certain auto-configurations were applied or skipped
- Categorized view with secondary tabs for positive matches, negative matches, and unconditional classes
- Detailed condition evaluation messages for debugging configuration issues

#### Secondary Tabs Navigation
- **Positive Matches**: View all auto-configurations that were successfully applied
- **Negative Matches**: Examine configurations that were skipped and the exact conditions that weren't met
- **Unconditional Classes**: See configurations that are always applied without conditions
- Fixed tab navigation that remains visible when scrolling through large condition reports

#### Search and Filtering
- Real-time search across all conditions with highlighted results
- Dynamic count indicators showing matches in each category
- Back-to-top button for easy navigation in large reports

This feature is particularly useful when:
- Debugging why certain auto-configurations aren't being applied
- Understanding the startup configuration of your Spring Boot application
- Optimizing your application by removing unnecessary dependencies

## 🔍 Auto-Detection

The plugin uses a multi-layered approach to detect Spring Boot Actuator:

1. **Class Detection**: Checks for the presence of key actuator classes in the classpath
2. **Bean Detection**: Looks for actuator-related beans in the Spring application context
3. **Endpoint Detection**: Falls back to checking for accessible actuator endpoints via HTTP

This ensures reliable detection even in complex application environments.

## 💻 Development

### Plugin Architecture

The Actuator Insights feature is implemented as a plugin with two main components:

1. **Backend Plugin Module**: `kraven-ui-actuator-insights-plugin`
   - Responsible for data collection, processing, and API exposure
   - Implements auto-detection of Spring Boot Actuator
   - Manages data caching and historical data storage
   - Handles configuration and settings management

2. **Frontend Components**: Integrated directly into the main Kraven UI Angular project
   - Angular-based interactive UI components
   - Chart and visualization libraries integration
   - Tab-based navigation system
   - Consistent styling with the main Kraven UI

### Building the Plugin

```bash
cd plugins/kraven-ui-actuator-insights-plugin
mvn clean package
```

### Running Tests

```bash
mvn test
```

### Frontend Components

The frontend components are organized into a modular structure:

```
kraven-ui-frontend/src/app/components/actuator-insights/
├── actuator-insights.module.ts
├── tab-container/
│   ├── actuator-tab-container.component.ts
│   ├── actuator-tab-container.component.html
│   └── actuator-tab-container.component.scss
├── health-tab/
├── metrics-tab/
├── environment-tab/
├── beans-tab/
├── threads-tab/
│   ├── threads-tab.component.ts
│   ├── threads-tab.component.html
│   ├── threads-tab.component.scss
│   └── thread-analysis.scss
├── conditions-tab/
│   ├── conditions-tab.component.ts
│   ├── conditions-tab.component.html
│   └── conditions-tab.component.scss
└── services/
    └── actuator-data.service.ts
```

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
