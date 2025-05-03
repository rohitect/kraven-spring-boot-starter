# Mock Server Feature Roadmap

## Feature Overview

The Mock Server feature for Kraven UI provides a configurable mock server for integration testing. It allows developers to define mock responses for endpoints via JSON configuration and switch between different response variations at runtime through the Kraven UI interface.

## Key Capabilities

- Configurable mock server that starts on port 11000 (or custom port)
- JSON-based configuration for defining mock endpoints and responses
- Support for multiple response variations per endpoint with default selection
- Runtime switching between different mock responses via the Kraven UI
- Request history tracking and visualization
- Response delay simulation for realistic testing scenarios
- Dynamic response generation based on request data
- Interactive JSON configuration viewer/editor with real-time preview
- Support for loading configurations from file path or classpath

## UI Integration

- Mock Server section accessible from the main header navigation
- Dashboard showing server status and configured endpoints
- Endpoint management interface with response selection
- Response editor with JSON validation and formatting
- Request history viewer with filtering options
- Interactive configuration viewer/editor with syntax highlighting
- Configuration path input supporting both file system paths and classpath resources

## Implementation Phases

### Phase 1: Core Infrastructure (Milestone 1)

**Estimated Timeline: 2-3 weeks**

1. **Mock Server Engine**
   - Implement basic HTTP server using Undertow
   - Create configuration model and loader
   - Implement request routing and response selection
   - Add server lifecycle management (start/stop)

2. **Spring Boot Integration**
   - Create `KravenUiMockServerAutoConfiguration` class
   - Define `KravenUiMockServerProperties` for configuration
   - Implement conditional beans for mock server components
   - Add server lifecycle hooks for Spring Boot integration

3. **Basic Configuration Support**
   - Define JSON schema for mock configurations
   - Implement configuration file loading and parsing from both file system and classpath
   - Support for basic endpoint definition with method and path
   - Support for multiple response variations per endpoint
   - Add configuration path resolution with precedence for volume paths over classpath resources

### Phase 2: UI Integration (Milestone 2)

**Estimated Timeline: 2-3 weeks**

1. **Mock Server Dashboard**
   - Add Mock Server navigation item to the header
   - Create dashboard component showing server status
   - Implement endpoint listing with active response indicators
   - Add server control buttons (start/stop/restart)

2. **Endpoint Management**
   - Create endpoint detail view
   - Implement response selection interface
   - Add response details view
   - Support for switching between different responses for existing endpoints

3. **Configuration Management**
   - Implement configuration loading and validation
   - Add import/export functionality
   - Create configuration validation with error highlighting
   - Support for hot-reloading configuration changes
   - Implement interactive JSON configuration viewer/editor with real-time preview
   - Add configuration path input supporting both file system paths and classpath resources

### Phase 3: Enhanced Features (Milestone 3)

**Estimated Timeline: 3-4 weeks**

1. **Advanced Request Matching**
   - Implement header-based matching
   - Add query parameter matching
   - Support for path variable extraction
   - Add request body content matching

2. **Dynamic Response Generation**
   - Implement template-based response generation
   - Add support for request data extraction
   - Create expression evaluation for dynamic values
   - Support for conditional response logic

3. **Response Delay Simulation**
   - Add configurable response delays
   - Implement random delay ranges
   - Support for conditional delays based on request attributes
   - Add UI controls for delay configuration

4. **Sequence Responses**
   - Implement sequential response delivery
   - Add cycle and one-time sequence options
   - Create UI for sequence management
   - Support for sequence reset

### Phase 4: Advanced Capabilities (Milestone 4)

**Estimated Timeline: 3-4 weeks**

1. **Proxy Mode**
   - Implement request proxying to real backends
   - Add configuration for proxy targets
   - Support for header manipulation
   - Create UI for proxy configuration

2. **Request Validation**
   - Implement JSON Schema validation for requests
   - Add validation error responses
   - Create UI for schema definition
   - Support for custom validation logic

3. **Response Templating**
   - Implement Handlebars template engine integration
   - Add helper functions for common operations
   - Create template editor with syntax highlighting
   - Support for template testing

4. **Request History**
   - Implement request logging and storage
   - Create history viewer with filtering
   - Add request/response detail view
   - Support for history export

### Phase 5: Refinement and Documentation (Milestone 5)

**Estimated Timeline: 2-3 weeks**

1. **Performance Optimization**
   - Optimize request handling for high throughput
   - Implement caching for frequently used responses
   - Add metrics collection for performance monitoring
   - Optimize configuration loading and parsing

2. **UI Enhancements**
   - Improve response editor with syntax highlighting
   - Add search and filtering for endpoints and responses
   - Implement drag-and-drop for response ordering
   - Add keyboard shortcuts for common operations

3. **Documentation**
   - Create comprehensive user documentation
   - Add examples for common use cases
   - Create API reference for programmatic usage
   - Add tutorials for getting started

4. **Testing and Validation**
   - Implement comprehensive test suite
   - Add integration tests with real-world scenarios
   - Create performance benchmarks
   - Add validation for configuration correctness

## Feature Completion Criteria

1. **Functional Completeness**
   - All planned features implemented and tested
   - UI components fully integrated with the backend
   - Configuration model fully documented and validated

2. **Performance Requirements**
   - Server startup time under 2 seconds
   - Request handling latency under 50ms (excluding configured delays)
   - Support for at least 100 concurrent connections
   - Memory usage under 100MB for typical configurations

3. **User Experience**
   - Intuitive UI for managing mock endpoints and responses
   - Clear feedback for configuration errors
   - Responsive interface even with large configurations
   - Consistent styling with the rest of Kraven UI

4. **Documentation**
   - Complete user guide with examples
   - API reference for programmatic usage
   - Configuration reference with all options
   - Troubleshooting guide for common issues

## JSON Configuration Example

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
        },
        {
          "id": "error",
          "status": 500,
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "error": "Internal server error",
            "message": "Failed to retrieve users"
          },
          "description": "Simulates a server error"
        }
      ]
    }
  ]
}
```

## UI Mockups

### Mock Server Dashboard

```
+-----------------------------------------------+
|                                               |
|  Mock Server Dashboard                        |
|                                               |
|  Status: Running on http://localhost:11000    |
|  [Stop Server] [Restart Server]               |
|                                               |
|  Configuration:                               |
|  [Classpath: mock-server/config.json     ][▼] |
|  [View/Edit Configuration]                    |
|                                               |
|  +-------------------+---------------------+  |
|  | Endpoints (15)    | Active Responses    |  |
|  +-------------------+---------------------+  |
|  | ✓ GET /api/users  | default             |  |
|  | ✓ POST /api/users | success             |  |
|  | ✓ GET /api/prod.. | empty               |  |
|  | ...               | ...                 |  |
|  +-------------------+---------------------+  |
|                                               |
|  [Import Config] [Export]                     |
|                                               |
+-----------------------------------------------+
```

### Endpoint Detail View

```
+-----------------------------------------------+
|                                               |
|  Endpoint: GET /api/users                     |
|                                               |
|  Available Responses:                         |
|  +-------------------+---------------------+  |
|  | Name    | Status  | Description         |  |
|  +---------+---------+---------------------+  |
|  | default | 200     | Returns user list   |  |
|  | empty   | 200     | Empty user list     |  |
|  | error   | 500     | Server error        |  |
|  +---------+---------+---------------------+  |
|                                               |
|  Active Response: default                     |
|  [Set as Active] [View Details]               |
|                                               |
|  Response Preview:                            |
|  {                                            |
|    "users": [                                 |
|      {"id": 1, "name": "John Doe"},          |
|      {"id": 2, "name": "Jane Smith"}         |
|    ]                                          |
|  }                                            |
|                                               |
+-----------------------------------------------+
```

### Configuration Viewer/Editor

```
+-----------------------------------------------+
|                                               |
|  Configuration Viewer/Editor                  |
|                                               |
|  Source: [Classpath: mock-server/config.json] |
|  [Switch to Volume Path]                      |
|                                               |
|  +-------------------------------------------+|
|  | {                                         ||
|  |   "endpoints": [                          ||
|  |     {                                     ||
|  |       "path": "/api/users",               ||
|  |       "method": "GET",                    ||
|  |       "responses": [                      ||
|  |         {                                 ||
|  |           "id": "default",                ||
|  |           "isDefault": true,              ||
|  |           ...                             ||
|  |         }                                 ||
|  |       ]                                   ||
|  |     }                                     ||
|  |   ]                                       ||
|  | }                                         ||
|  +-------------------------------------------+|
|                                               |
|  [Format JSON] [Copy to Clipboard] [Close]    |
|  Note: Changes are not saved automatically.   |
|  Copy this configuration to save it manually. |
|                                               |
+-----------------------------------------------+
```

## Configuration Properties

```yaml
kraven:
  ui:
    mock-server:
      enabled: true
      port: 11000
      host: localhost
      # base-path is optional and can be omitted
      base-path:
      # Configuration can be loaded from classpath or file system
      # File system path takes precedence if both are specified
      config-path: classpath:mock-server/config.json
      config-volume-path: /path/to/config/volume/mock-config.json
      auto-reload: true
      reload-interval-ms: 5000
      max-history-entries: 100
      default-delay-ms: 0
```

## Dependencies

- Undertow for the HTTP server
- Jackson for JSON processing
- Handlebars for template rendering
- Spring Boot for auto-configuration
- Angular for UI components
