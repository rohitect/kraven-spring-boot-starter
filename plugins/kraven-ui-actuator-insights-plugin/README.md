# 📊 Kraven UI Actuator Insights Plugin

A powerful Spring Boot Actuator visualization and monitoring plugin for Kraven UI.

## 🌟 Features

- **Real-time visualization** of application health, performance metrics, and system resources
- **Interactive exploration** of application internals (beans, environment, configurations)
- **Historical data analysis** to identify trends and potential issues
- **Smart auto-detection** of Spring Boot Actuator in your application (by class, bean, or endpoint)
- **Customizable dashboard** with various visualization options

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
2. **View Health Status**: See the current health of your application and its components
3. **Monitor Metrics**: View real-time metrics with historical trends
4. **Explore Environment**: Examine your application's environment properties
5. **Analyze Threads**: View thread dumps and identify potential issues

### Environment Properties Display

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

## 🔍 Auto-Detection

The plugin uses a multi-layered approach to detect Spring Boot Actuator:

1. **Class Detection**: Checks for the presence of key actuator classes in the classpath
2. **Bean Detection**: Looks for actuator-related beans in the Spring application context
3. **Endpoint Detection**: Falls back to checking for accessible actuator endpoints via HTTP

This ensures reliable detection even in complex application environments.

## 💻 Development

### Building the Plugin

```bash
cd plugins/kraven-ui-actuator-insights-plugin
mvn clean package
```

### Running Tests

```bash
mvn test
```

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
