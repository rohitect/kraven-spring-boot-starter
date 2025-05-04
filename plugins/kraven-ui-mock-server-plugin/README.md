# Kraven UI Mock Server Plugin

A configurable mock server plugin for Kraven UI that facilitates both integration testing and development by providing a way to mock API endpoints. Perfect for testing your application without depending on external services or for developing frontend applications while backend services are still in development.

## 🚀 Features

- **Configurable Mock Server**: Starts on port 11000 (or custom port)
- **JSON Configuration**: Define mock endpoints and responses via JSON
- **Multiple Response Variations**: Support for multiple response variations per endpoint
- **Runtime Switching**: Switch between different mock responses via the Kraven UI
- **Request History**: Track and visualize request history
- **Response Delay Simulation**: Simulate network latency for realistic testing
- **Dynamic Response Generation**: Generate responses based on request data
- **Interactive Configuration**: View and edit configurations with real-time preview
- **Spring Property Resolution**: Support for Spring Boot property placeholders in endpoint paths
- **Development Mode**: Perfect for developing applications against mock services
- **Reliable Restart**: Robust server restart capability for continuous development

## 🛠️ Installation

### Maven

Add the Mock Server plugin to your project:

```xml
<dependency>
    <groupId>io.github.rohitect</groupId>
    <artifactId>kraven-ui-mock-server-plugin</artifactId>
    <version>1.0.6</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.github.rohitect:kraven-ui-mock-server-plugin:1.0.6'
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
kraven.ui.plugin.mock-server.config-path=classpath:mock-server/config.json
kraven.ui.plugin.mock-server.auto-reload=true
kraven.ui.plugin.mock-server.reload-interval-ms=5000
```

## 📋 Mock Configuration

Create a JSON configuration file for your mock endpoints:

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

```json
{
  "id": "slow",
  "delay": 2000,
  "status": 200,
  "body": { "result": "Operation completed" },
  "description": "Simulates a slow operation (2 second delay)"
}
```

### Request Matching

```json
{
  "path": "/api/users/{id}",
  "method": "GET",
  "matchers": [
    {
      "type": "path-variable",
      "name": "id",
      "value": "1"
    },
    {
      "type": "header",
      "name": "Authorization",
      "pattern": "Bearer .*"
    }
  ],
  "responses": [...]
}
```

### Dynamic Response Generation

```json
{
  "id": "echo",
  "status": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "bodyTemplate": {
    "message": "You sent: {{request.body.message}}",
    "timestamp": "{{now}}",
    "requestHeaders": "{{request.headers}}"
  },
  "description": "Echoes back the request data"
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

### Enhanced Server Restart Capability

The mock server now features a robust restart mechanism that ensures reliable operation during development:

- **Resource Management**: Properly releases resources when stopping the server
- **Scheduler Handling**: Recreates the scheduler when restarting to prevent `RejectedExecutionException`
- **Error Handling**: Improved error handling during start/stop operations
- **Graceful Shutdown**: Ensures clean shutdown before restart to prevent resource leaks
- **UI Feedback**: Provides clear feedback on server status during restart operations

This enhancement makes the mock server more reliable for continuous development scenarios where frequent restarts are common.

## 📝 License

MIT License
