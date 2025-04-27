# Kraven UI Configuration Guide

Kraven UI provides a comprehensive configuration system that allows you to customize all aspects of the UI. This guide explains how to configure Kraven UI using different methods.

## Configuration Methods

Kraven UI supports multiple configuration methods, with the following precedence (highest to lowest):

1. Environment variables with JSON format
2. Application properties/YAML files
3. Default values

## Using Environment Variables

You can configure Kraven UI using the `KRAVEN_UI_CONFIG` environment variable with a JSON string:

```bash
export KRAVEN_UI_CONFIG='{"path":"/api-docs","theme":{"darkPrimaryColor":"#6c5ce7","darkSecondaryColor":"#00b894","darkBackgroundColor":"#1a1b2e","lightPrimaryColor":"#2196f3","lightSecondaryColor":"#ff9800","lightBackgroundColor":"#ffffff","defaultTheme":"dark"},"kafka":{"messageLimit":100,"messageProductionEnabled":true,"messageConsumptionEnabled":true}}'
```

This is particularly useful for containerized environments or when you want to override configuration without changing application files.

## Using Application Properties

You can configure Kraven UI using `application.properties` or `application.yml` files:

### application.properties

```properties
# Basic configuration
kraven.ui.enabled=true
kraven.ui.path=/kraven
kraven.ui.development-mode=false
kraven.ui.version=1.0.1


# Theme configuration
kraven.ui.theme.dark-primary-color=#6c5ce7
kraven.ui.theme.dark-secondary-color=#00b894
kraven.ui.theme.dark-background-color=#1a1b2e
kraven.ui.theme.light-primary-color=#1976d2
kraven.ui.theme.light-secondary-color=#424242
kraven.ui.theme.light-background-color=#ffffff

kraven.ui.theme.default-theme=dark
kraven.ui.theme.respect-system-preference=true

# API documentation configuration
kraven.ui.api-docs.enabled=true
kraven.ui.api-docs.spec-path=/v3/api-docs
kraven.ui.api-docs.try-it-out-enabled=true


# Feign client configuration
kraven.ui.feign-client.enabled=true
kraven.ui.feign-client.base-packages=io.github,com,org,net
kraven.ui.feign-client.try-it-out-enabled=true
kraven.ui.feign-client.cache-metadata=true

# Kafka configuration
kraven.ui.kafka.enabled=true
kraven.ui.kafka.base-packages=io.github,com,org,net
kraven.ui.kafka.message-limit=100
kraven.ui.kafka.message-production-enabled=true
kraven.ui.kafka.message-consumption-enabled=true

# Metrics configuration
kraven.ui.metrics.enabled=true
kraven.ui.metrics.jvm-metrics-enabled=true
kraven.ui.metrics.spring-metrics-enabled=true
kraven.ui.metrics.kafka-metrics-enabled=true
kraven.ui.metrics.feign-metrics-enabled=true
kraven.ui.metrics.refresh-interval-ms=5000
kraven.ui.metrics.auto-refresh-enabled=false
kraven.ui.metrics.thread-dump-enabled=true
kraven.ui.metrics.heap-dump-enabled=false

# Business Flow configuration
kraven.ui.business-flow.enabled=true
kraven.ui.business-flow.base-packages=io.github,com,org,net
kraven.ui.business-flow.show-detailed-method-info=true

# Documentation configuration
kraven.ui.documentation.enabled=true
kraven.ui.documentation.path=classpath:kraven-docs/
kraven.ui.documentation.mermaid-enabled=true
kraven.ui.documentation.syntax-highlighting-enabled=true
kraven.ui.documentation.business-flow-tags-enabled=true
kraven.ui.documentation.auto-refresh-enabled=false
kraven.ui.documentation.refresh-interval-ms=0
```

### application.yml

```yaml
kraven:
  ui:
    enabled: true
    path: /kraven
    development-mode: false
    version: 1.0.1

    theme:
      # Dark theme specific colors
      dark-primary-color: "#6c5ce7"
      dark-secondary-color: "#00b894"
      dark-background-color: "#1a1b2e"

      # Light theme specific colors
      light-primary-color: "#1976d2"
      light-secondary-color: "#424242"
      light-background-color: "#ffffff"

      default-theme: dark
      respect-system-preference: true

    api-docs:
      enabled: true
      spec-path: /v3/api-docs
      try-it-out-enabled: true

    feign-client:
      enabled: true
      base-packages:
        - io.github
        - com
        - org
        - net
      try-it-out-enabled: true
      cache-metadata: true

    kafka:
      enabled: true
      base-packages:
        - io.github
        - com
        - org
        - net
      message-limit: 100
      message-production-enabled: true
      message-consumption-enabled: true

    metrics:
      enabled: true
      jvm-metrics-enabled: true
      spring-metrics-enabled: true
      kafka-metrics-enabled: true
      feign-metrics-enabled: true
      refresh-interval-ms: 5000
      auto-refresh-enabled: false
      thread-dump-enabled: true
      heap-dump-enabled: false

    business-flow:
      enabled: true
      base-packages:
        - io.github
        - com
        - org
        - net
      show-detailed-method-info: true

    documentation:
      enabled: true
      path: classpath:kraven-docs/
      mermaid-enabled: true
      syntax-highlighting-enabled: true
      business-flow-tags-enabled: true
      auto-refresh-enabled: false
      refresh-interval-ms: 0
```

## Configuration Properties Reference

### Basic Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.enabled` | Enable or disable Kraven UI | `true` |
| `kraven.ui.path` | The path where the Kraven UI will be served | `/kraven` |
| `kraven.ui.development-mode` | Enable development mode for easier resource loading | `false` |
| `kraven.ui.version` | The version of Kraven UI | `1.0.1` |



### Theme Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.theme.dark-primary-color` | The primary color for the dark theme | `#6c5ce7` |
| `kraven.ui.theme.dark-secondary-color` | The secondary color for the dark theme | `#00b894` |
| `kraven.ui.theme.dark-background-color` | The background color for the dark theme | `#1a1b2e` |
| `kraven.ui.theme.light-primary-color` | The primary color for the light theme | `#1976d2` |
| `kraven.ui.theme.light-secondary-color` | The secondary color for the light theme | `#424242` |
| `kraven.ui.theme.light-background-color` | The background color for the light theme | `#ffffff` |

| `kraven.ui.theme.default-theme` | The default theme to use (light or dark) | `dark` |
| `kraven.ui.theme.respect-system-preference` | Whether to respect the user's system preference for light/dark mode | `true` |

### API Documentation Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.api-docs.enabled` | Enable or disable API documentation | `true` |
| `kraven.ui.api-docs.spec-path` | The path to the OpenAPI specification | `/v3/api-docs` |
| `kraven.ui.api-docs.try-it-out-enabled` | Whether to enable the try-it-out feature | `true` |


### Feign Client Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.feign-client.enabled` | Enable or disable Feign client scanning | `true` |
| `kraven.ui.feign-client.base-packages` | The base packages to scan for Feign clients | `io.github,com,org,net` |
| `kraven.ui.feign-client.try-it-out-enabled` | Whether to enable the try-it-out feature for Feign clients | `true` |
| `kraven.ui.feign-client.cache-metadata` | Whether to cache Feign client metadata | `true` |

### Kafka Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.kafka.enabled` | Enable or disable Kafka management features | `true` |
| `kraven.ui.kafka.base-packages` | The base packages to scan for Kafka listeners | `io.github,com,org,net` |
| `kraven.ui.kafka.message-limit` | The maximum number of messages to retrieve per request | `100` |
| `kraven.ui.kafka.message-production-enabled` | Whether to enable message production | `true` |
| `kraven.ui.kafka.message-consumption-enabled` | Whether to enable message consumption | `true` |

### Metrics Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.metrics.enabled` | Enable or disable metrics collection | `true` |
| `kraven.ui.metrics.jvm-metrics-enabled` | Whether to enable JVM metrics | `true` |
| `kraven.ui.metrics.spring-metrics-enabled` | Whether to enable Spring metrics | `true` |
| `kraven.ui.metrics.kafka-metrics-enabled` | Whether to enable Kafka metrics | `true` |
| `kraven.ui.metrics.feign-metrics-enabled` | Whether to enable Feign client metrics | `true` |
| `kraven.ui.metrics.refresh-interval-ms` | The refresh interval in milliseconds for metrics | `5000` |
| `kraven.ui.metrics.auto-refresh-enabled` | Whether to enable auto-refresh of metrics | `false` |
| `kraven.ui.metrics.thread-dump-enabled` | Whether to enable thread dump generation | `true` |
| `kraven.ui.metrics.heap-dump-enabled` | Whether to enable heap dump generation | `false` |

### Business Flow Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.business-flow.enabled` | Enable or disable business flow features | `true` |
| `kraven.ui.business-flow.base-packages` | The base packages to scan for KravenTag annotations | `io.github,com,org,net` |
| `kraven.ui.business-flow.show-detailed-method-info` | Whether to show detailed method information in the UI | `true` |

### Documentation Configuration

| Property | Description | Default Value |
|----------|-------------|---------------|
| `kraven.ui.documentation.enabled` | Enable or disable documentation features | `true` |
| `kraven.ui.documentation.path` | The path to the documentation files | `classpath:kraven-docs/` |
| `kraven.ui.documentation.mermaid-enabled` | Whether to enable Mermaid diagram support | `true` |
| `kraven.ui.documentation.syntax-highlighting-enabled` | Whether to enable syntax highlighting for code blocks | `true` |
| `kraven.ui.documentation.business-flow-tags-enabled` | Whether to enable business flow tag support in documentation | `true` |
| `kraven.ui.documentation.auto-refresh-enabled` | Whether to enable auto-refresh of documentation | `false` |
| `kraven.ui.documentation.refresh-interval-ms` | The refresh interval in milliseconds for documentation | `0` |

## Additional Properties

You can also pass custom configuration to the frontend using the `kraven.ui.additional-properties` map:

```yaml
kraven:
  ui:
    additional-properties:
      custom-feature-enabled: true
      custom-feature-config:
        option1: value1
        option2: value2
```

These properties will be available in the frontend as part of the `window.__KRAVEN_CONFIG__` object.

## Example: Docker Compose Configuration

Here's an example of how to configure Kraven UI in a Docker Compose environment:

```yaml
version: '3'
services:
  app:
    image: your-spring-boot-app:latest
    environment:
      - KRAVEN_UI_CONFIG={"path":"/api-docs","theme":{"darkPrimaryColor":"#6c5ce7","darkSecondaryColor":"#00b894","darkBackgroundColor":"#1a1b2e","lightPrimaryColor":"#2196f3","lightSecondaryColor":"#ff9800","lightBackgroundColor":"#ffffff","defaultTheme":"dark"},"kafka":{"messageLimit":100,"messageProductionEnabled":true,"messageConsumptionEnabled":true},"metrics":{"refreshIntervalMs":5000,"autoRefreshEnabled":false,"threadDumpEnabled":true,"heapDumpEnabled":false}}
    ports:
      - "8080:8080"
```

## Example: Kubernetes Configuration

Here's an example of how to configure Kraven UI in a Kubernetes environment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-spring-boot-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: your-spring-boot-app
  template:
    metadata:
      labels:
        app: your-spring-boot-app
    spec:
      containers:
      - name: your-spring-boot-app
        image: your-spring-boot-app:latest
        env:
        - name: KRAVEN_UI_CONFIG
          value: '{"path":"/api-docs","theme":{"darkPrimaryColor":"#6c5ce7","darkSecondaryColor":"#00b894","darkBackgroundColor":"#1a1b2e","lightPrimaryColor":"#2196f3","lightSecondaryColor":"#ff9800","lightBackgroundColor":"#ffffff","defaultTheme":"dark"},"kafka":{"messageLimit":100,"messageProductionEnabled":true,"messageConsumptionEnabled":true},"metrics":{"refreshIntervalMs":5000,"autoRefreshEnabled":false,"threadDumpEnabled":true,"heapDumpEnabled":false}}'
        ports:
        - containerPort: 8080
```

## Troubleshooting

If you encounter issues with your configuration:

1. Check the application logs for configuration-related messages
2. Verify that your JSON syntax is correct when using the environment variable
3. Ensure that your application.properties or application.yml file is in the correct location
4. Check that the configuration properties are correctly spelled and have the correct types

### Theme Configuration Issues

If you're experiencing issues with the theme:

1. Make sure you're using the new theme-specific color properties (`dark-primary-color`, `dark-secondary-color`, `dark-background-color`, `light-primary-color`, `light-secondary-color`, `light-background-color`) instead of the deprecated `primary-color` and `secondary-color` properties.
2. Check that your color values are valid hex codes (e.g., `#1976d2`).
3. If the theme doesn't change when switching between light and dark mode, verify that the theme-specific colors are correctly set.
4. If you're using custom CSS, make sure it's compatible with both light and dark themes by using the CSS variables provided by Kraven UI.
