# Kraven UI Mock Server Plugin

A configurable mock server plugin for Kraven UI that facilitates both integration testing and development by providing a way to mock API endpoints. Perfect for testing your application without depending on external services or for developing frontend applications while backend services are still in development.

> **Implementation Status:** 70% Complete - Phase 3 fully implemented, Phase 4 in progress
>
> ✅ **Phase 1-3 Complete!** The mock server includes plugin infrastructure, UI integration, advanced request matching, dynamic response generation, and response delay simulation.
>
> 🔄 **Phase 4 In Progress:** Currently implementing sequence responses, plugin extension points, and request history features.
>
> ⏳ **Phase 5 Pending:** Documentation, performance optimization, and UI enhancements planned for future releases.

## 🚀 Features

- **Configurable Mock Server**: Starts on port 11000 (or custom port)
- **JSON Configuration**: Define mock endpoints and responses via JSON
- **Multiple Response Variations**: Support for multiple response variations per endpoint
- **Runtime Switching**: Switch between different mock responses via the Kraven UI
- **Request History**: Track and visualize request history
- **Response Delay Simulation**: Simulate network latency for realistic testing
- **Dynamic Response Generation**: Generate responses based on request data with template engines
- **Advanced Request Matching**: Match requests based on headers, query parameters, path variables, and body content
- **Template-based Responses**: Use Handlebars templates for dynamic response generation
- **Path Variable Extraction**: Extract and use path variables in templates and matchers
- **Interactive Configuration**: View and edit configurations with real-time preview
- **Spring Property Resolution**: Support for Spring Boot property placeholders in endpoint paths
- **Development Mode**: Perfect for developing applications against mock services
- **Reliable Restart**: Robust server restart capability for continuous development
- **Plugin API Extensions**: Extended API for advanced features and integrations
- **Event System**: Event-based notifications for plugin actions

## 🛠️ Installation

### Maven

Add the Mock Server plugin to your project:

```xml
<dependency>
    <groupId>io.github.rohitect</groupId>
    <artifactId>kraven-ui-mock-server-plugin</artifactId>
    <version>1.0.7</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.github.rohitect:kraven-ui-mock-server-plugin:1.0.7'
```

## ⚙️ Configuration

Configure the Mock Server plugin in your `application.properties` or `application.yml`:

```properties
# Enable the plugin system
kraven.ui.plugins.enabled=true

# Mock Server plugin configuration
kraven.ui.plugin.mock-server.enabled=true
kraven.ui.plugin.mock-server.auto-start=false  # Set to true to start the server automatically
kraven.ui.plugin.mock-server.port=11000
kraven.ui.plugin.mock-server.host=localhost
kraven.ui.plugin.mock-server.config-path=classpath:mock-server/comprehensive-config.json
kraven.ui.plugin.mock-server.auto-reload=true
kraven.ui.plugin.mock-server.reload-interval-ms=5000
kraven.ui.plugin.mock-server.default-delay-ms=0
kraven.ui.plugin.mock-server.default-template-engine=simple  # Options: simple, handlebars
kraven.ui.plugin.mock-server.enable-advanced-matching=true
kraven.ui.plugin.mock-server.enable-dynamic-responses=true
```

## 📋 Mock Configuration

The mock server now uses a unified configuration approach with advanced features enabled by default. A comprehensive configuration file with examples ranging from basic to advanced is included at `classpath:mock-server/comprehensive-config.json`.

You can create your own JSON configuration file for your mock endpoints:

```json
{
  "endpoints": [
    {
      "path": "/api/users",
      "method": "GET",
      "responses": [
        {
          "id": "default",
          "isDefault": true,
          "status": 200,
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "users": [
              {"id": 1, "name": "John Doe"},
              {"id": 2, "name": "Jane Smith"}
            ]
          },
          "description": "Returns a list of users"
        },
        {
          "id": "empty",
          "status": 200,
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "users": []
          },
          "description": "Returns an empty list of users"
        }
      ]
    }
  ]
}
```

## 🧩 Architecture

The Mock Server plugin follows a modular architecture:

- **Plugin Integration**: Implements the Kraven UI plugin system
- **HTTP Server**: Uses Undertow for high-performance request handling
- **Configuration Model**: Flexible JSON-based configuration
- **UI Integration**: Seamless integration with the Kraven UI interface

## 🔄 Usage

1. **Start the Application**: The Mock Server plugin will automatically register with Kraven UI
2. **Access the Mock Server UI**: Navigate to the "Mock Server" section in the Kraven UI
3. **Start the Server**: Click the "Start Server" button to start the mock server (unless auto-start is enabled)
4. **View Endpoints**: See all configured mock endpoints
5. **Switch Responses**: Change the active response for each endpoint
6. **View Request History**: See all requests made to the mock server
7. **Edit Configuration**: Update the mock configuration in real-time
8. **Stop the Server**: Click the "Stop Server" button when you're done

## 💻 Development Use Cases

The Mock Server plugin is not just for testing - it's also a powerful tool for development:

### Frontend Development Without Backend Dependencies
- Develop your frontend application against mock endpoints while the backend is still in development
- Create realistic mock responses that match your API contract
- Switch between different response scenarios to test various UI states
- Simulate error conditions and edge cases that are difficult to reproduce with real backends

### Microservice Development
- Mock dependent services that your microservice relies on
- Develop and test your service in isolation without setting up the entire ecosystem
- Simulate various response patterns from other services including delays and failures
- Test how your service handles different response scenarios from dependencies

### API Contract Testing
- Validate that your client applications correctly implement the API contract
- Ensure your frontend correctly handles all possible response types
- Test error handling and edge cases without having to trigger them in real services
- Verify that your application works with the expected API response structure

### Server Control

The mock server can be controlled in three ways:

1. **Auto-start**: Set `kraven.ui.plugin.mock-server.auto-start=true` to start the server automatically when the plugin starts
2. **UI Control**: Use the "Start Server" and "Stop Server" buttons in the UI
3. **API Control**: Use the REST API endpoints:
   - `POST /kraven/plugin/mock-server/server/start` - Start the server
   - `POST /kraven/plugin/mock-server/server/stop` - Stop the server
   - `GET /kraven/plugin/mock-server/server/status` - Get the server status

## 🛠️ Advanced Features

### Response Delay Simulation

The mock server supports various delay simulation options to create realistic testing scenarios:

#### Fixed Delay

```json
{
  "id": "slow",
  "delay": 2000,
  "status": 200,
  "body": { "result": "Operation completed" },
  "description": "Simulates a slow operation (2 second delay)"
}
```

#### Random Delay Range

```json
{
  "id": "variable-latency",
  "delayRange": true,
  "minDelay": 500,
  "maxDelay": 3000,
  "status": 200,
  "body": { "result": "Operation completed with variable latency" },
  "description": "Simulates variable network latency (500-3000ms)"
}
```

#### Conditional Delays

```json
{
  "id": "conditional-delay",
  "delay": 5000,
  "delayConditions": [
    {
      "type": "header",
      "name": "X-Slow-Response",
      "operator": "equals",
      "value": "true"
    },
    {
      "type": "query-param",
      "name": "simulate",
      "operator": "equals",
      "value": "slow-network",
      "required": false
    }
  ],
  "status": 200,
  "body": { "result": "Operation completed with conditional delay" },
  "description": "Applies delay only when specific conditions are met"
}
```

### Advanced Request Matching

The mock server supports advanced request matching based on headers, query parameters, path variables, and body content:

```json
{
  "path": "/api/users/${userId}",
  "method": "GET",
  "matchers": [
    {
      "type": "path-variable",
      "name": "userId",
      "operator": "regex",
      "pattern": "^[0-9]+$",
      "required": true
    },
    {
      "type": "header",
      "name": "Authorization",
      "operator": "startsWith",
      "value": "Bearer ",
      "caseSensitive": true
    },
    {
      "type": "query-param",
      "name": "filter",
      "operator": "exists",
      "required": false
    },
    {
      "type": "body",
      "name": "$.user.name",
      "operator": "equals",
      "value": "John Doe"
    }
  ],
  "responses": [...]
}
```

Supported matcher types:
- `path-variable`: Match path variables extracted from the URL
- `header`: Match request headers
- `query-param`: Match query parameters
- `body`: Match JSON body content using JSONPath expressions

Supported operators:
- `equals`: Exact match
- `contains`: Contains the value
- `startsWith`: Starts with the value
- `endsWith`: Ends with the value
- `regex`: Matches the regular expression pattern
- `exists`: The value exists (any value)

### Dynamic Response Generation with Handlebars Templates

```json
{
  "id": "template-response",
  "status": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "bodyTemplate": "{\n  \"message\": \"You sent: {{request.body.message}}\",\n  \"timestamp\": {{timestamp}},\n  \"uuid\": \"{{uuid}}\",\n  \"pathVariables\": {\n    \"id\": \"{{request.pathVariables.id}}\"\n  },\n  \"queryParams\": {\n    \"filter\": \"{{request.queryParams.filter.[0]}}\"\n  },\n  \"headers\": {\n    \"authorization\": \"{{request.headers.authorization}}\"\n  }\n}",
  "bodyTemplateEngine": "handlebars",
  "description": "Uses Handlebars templates for dynamic response generation"
}
```

### Conditional Logic in Templates

```json
{
  "id": "conditional-template",
  "status": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "bodyTemplate": "{\n  \"products\": [\n    {{#each (range 1 5)}}\n    {\n      \"id\": {{this}},\n      \"name\": \"Product {{this}}\",\n      \"price\": {{random min=10 max=100}},\n      \"inStock\": {{#if (eq (mod this 2) 0)}}true{{else}}false{{/if}}\n    }{{#unless @last}},{{/unless}}\n    {{/each}}\n  ],\n  \"total\": 5,\n  \"page\": {{#if request.queryParams.page}}{{request.queryParams.page.[0]}}{{else}}1{{/if}},\n  \"pageSize\": {{#if request.queryParams.size}}{{request.queryParams.size.[0]}}{{else}}10{{/if}}\n}",
  "bodyTemplateEngine": "handlebars",
  "description": "Uses conditional logic and loops in templates"
}
```

### Spring Boot Property Placeholders

You can use Spring Boot property placeholders in your endpoint paths, which will be resolved at runtime:

```json
{
  "endpoints": [
    {
      "path": "${api.base-path}/users",
      "method": "GET",
      "responses": [
        {
          "id": "default",
          "isDefault": true,
          "status": 200,
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "users": [
              {"id": 1, "name": "John Doe"},
              {"id": 2, "name": "Jane Smith"}
            ]
          }
        }
      ]
    }
  ]
}
```

With this configuration and `api.base-path=/v1/api` in your application.properties, the mock server will respond to requests at `/v1/api/users` while still showing the original template path with variables in the UI.

## 🔧 Recent Improvements

### Unified Configuration

The mock server now uses a unified configuration approach:

- **Advanced Features by Default**: Advanced request matching and dynamic response generation are enabled by default
- **Single Configuration File**: All features are configured through a single configuration file
- **Simplified Setup**: No need for separate configuration files for basic and advanced features
- **Backward Compatible**: Existing configurations will continue to work with the new unified approach

### Plugin API Extensions

The mock server now provides extended API endpoints for advanced features:

- **Template Testing**: `POST /kraven/plugin/mock-server/test-template` - Test template rendering with sample data
- **Path Variable Extraction**: `GET /kraven/plugin/mock-server/extract-path-variables` - Extract variables from path patterns
- **Template Engines**: `GET /kraven/plugin/mock-server/template-engines` - Get available template engines
- **Matchers**: `GET /kraven/plugin/mock-server/matchers` - Get available matcher types and operators
- **Capabilities**: `GET /kraven/plugin/mock-server/capabilities` - Get plugin capabilities

### Advanced Request Matching

The mock server now supports advanced request matching based on:

- **Headers**: Match requests based on header values
- **Query Parameters**: Match requests based on query parameter values
- **Path Variables**: Match requests based on path variable values
- **Body Content**: Match requests based on JSON body content using JSONPath

### Template-based Response Generation

The mock server now supports template-based response generation using:

- **Handlebars Templates**: Full Handlebars template engine with helpers
- **Simple Templates**: Basic variable substitution with `${variable}` syntax
- **Request Data Access**: Access request data in templates (headers, query parameters, path variables, body)
- **Dynamic Values**: Generate dynamic values like timestamps, UUIDs, and random numbers
- **Conditional Logic**: Use conditional logic and loops in templates

### Response Delay Simulation

The mock server now includes advanced response delay simulation capabilities:

- **Fixed Delays**: Configure specific delay times for responses
- **Random Delay Ranges**: Simulate variable network conditions with random delays
- **Conditional Delays**: Apply delays only when specific conditions are met
- **Request-based Conditions**: Trigger delays based on headers, query parameters, path variables, or request path
- **Flexible Configuration**: Combine different delay strategies for realistic testing scenarios

### Event System

The mock server now includes an event system for plugin notifications:

- **Server Events**: Notifications for server start/stop events
- **Configuration Events**: Notifications for configuration loading/reloading
- **Request Events**: Notifications for request/response events
- **Template Events**: Notifications for template testing events

### Enhanced Server Restart Capability

The mock server now features a robust restart mechanism that ensures reliable operation during development:

- **Resource Management**: Properly releases resources when stopping the server
- **Scheduler Handling**: Recreates the scheduler when restarting to prevent `RejectedExecutionException`
- **Error Handling**: Improved error handling during start/stop operations
- **Graceful Shutdown**: Ensures clean shutdown before restart to prevent resource leaks
- **UI Feedback**: Provides clear feedback on server status during restart operations

These enhancements make the mock server more powerful and reliable for development and testing scenarios.

## 🗺️ Roadmap

The Mock Server plugin is being developed in phases:

| Feature | Status | Expected |
|---------|--------|----------|
| Plugin Infrastructure | ✅ Completed | Q1 2023 |
| UI Integration | ✅ Completed | Q2 2023 |
| Advanced Request Matching | ✅ Completed | Q3 2023 |
| Dynamic Response Generation | ✅ Completed | Q3 2023 |
| Response Delay Simulation | ✅ Completed | Q3 2023 |
| Sequence Responses | 🔄 In Progress | Q4 2023 |
| Plugin Extension Points | 🔄 In Progress | Q4 2023 |
| Request History | 🔄 In Progress | Q4 2023 |
| Proxy Mode | ⏳ Pending | Q4 2023 |
| Request Validation | ⏳ Pending | Q4 2023 |
| Performance Optimization | ⏳ Pending | Q1 2024 |
| UI Enhancements | ⏳ Pending | Q1 2024 |
| Comprehensive Documentation | 🔄 In Progress | Q1 2024 |

For a detailed roadmap, see the [Mock Server Feature Roadmap](https://github.com/rohitect/springdoc-nova-ui/blob/main/docs/designDocs/mock-server-feature-roadmap.md).

## 📝 License

MIT License
