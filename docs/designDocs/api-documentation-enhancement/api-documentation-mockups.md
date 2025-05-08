# API Documentation UI Mockups

This document provides visual mockups and UI design specifications for the enhanced API Documentation feature.

## Mode Toggle

The mode toggle will be prominently displayed in the header to allow users to switch between Documentation and Playground modes.

```
+---------------------------------------------------------------+
|                                                               |
|  [Documentation] | Playground       Search: [____________]    |
|                                                               |
+---------------------------------------------------------------+
```

## Documentation Mode Layout

The Documentation mode will have a three-pane layout similar to the existing Playground but optimized for browsing and understanding APIs.

```
+---------------------------------------------------------------+
|                                                               |
|  [Documentation] | Playground       Search: [____________]    |
|                                                               |
+---------------------------------------------------------------+
|                  |                                            |
|  API ENDPOINTS   |  GET /api/users                            |
|  +-----------+   |  =======================================   |
|  | Users     |   |                                            |
|  | - List    |   |  Description                               |
|  | - Get     |   |  -----------                               |
|  | - Create  |   |  Get a list of users with optional         |
|  | - Update  |   |  filtering and pagination.                 |
|  | - Delete  |   |                                            |
|  +-----------+   |  Parameters                                |
|  | Products  |   |  ----------                                |
|  | ...       |   |  - limit (query, optional): Maximum        |
|  +-----------+   |    number of users to return               |
|                  |    Type: integer                           |
|                  |    Default: 10                             |
|                  |                                            |
|                  |  - offset (query, optional): Number of     |
|                  |    users to skip                           |
|                  |    Type: integer                           |
|                  |    Default: 0                              |
|                  |                                            |
|                  |  [View in Playground]                      |
|                  |                                            |
+------------------+--------------------------------------------+
```

## Documentation View Components

### Endpoint List (Left Pane)

The left pane will show a hierarchical view of API endpoints grouped by tags.

```
+------------------+
|                  |
|  API ENDPOINTS   |
|  +-----------+   |
|  | Users     |   |
|  | - List    |   |
|  | - Get     |   |
|  | - Create  |   |
|  | - Update  |   |
|  | - Delete  |   |
|  +-----------+   |
|  | Products  |   |
|  | - List    |   |
|  | - Get     |   |
|  | - Create  |   |
|  | ...       |   |
|  +-----------+   |
|  | Orders    |   |
|  | ...       |   |
|  +-----------+   |
|                  |
+------------------+
```

### Endpoint Documentation (Center Pane)

The center pane will show comprehensive documentation for the selected endpoint.

```
+--------------------------------------------+
|                                            |
|  GET /api/users                            |
|  =======================================   |
|                                            |
|  Description                               |
|  -----------                               |
|  Get a list of users with optional         |
|  filtering and pagination.                 |
|                                            |
|  Parameters                                |
|  ----------                                |
|  - limit (query, optional): Maximum        |
|    number of users to return               |
|    Type: integer                           |
|    Default: 10                             |
|                                            |
|  - offset (query, optional): Number of     |
|    users to skip                           |
|    Type: integer                           |
|    Default: 0                              |
|                                            |
|  Response                                  |
|  --------                                  |
|  200 OK: List of users                     |
|  Content-Type: application/json            |
|                                            |
|  [                                         |
|    {                                       |
|      "id": "123",                          |
|      "name": "John Doe",                   |
|      "email": "john@example.com"           |
|    },                                      |
|    ...                                     |
|  ]                                         |
|                                            |
|  [View in Playground]                      |
|                                            |
+--------------------------------------------+
```

### Code Examples (Right Pane)

The right pane will show code examples in multiple languages.

```
+--------------------------------------------+
|                                            |
|  Code Examples                             |
|  =============                             |
|                                            |
|  [cURL] [JavaScript] [Python] [Java]       |
|                                            |
|  ```bash                                   |
|  curl -X GET "https://api.example.com/     |
|  api/users?limit=10&offset=0"              |
|  -H "Accept: application/json"             |
|  -H "Authorization: Bearer {token}"        |
|  ```                                       |
|                                            |
|  [Copy to Clipboard]                       |
|                                            |
|  Example Response                          |
|  ---------------                           |
|                                            |
|  ```json                                   |
|  [                                         |
|    {                                       |
|      "id": "123",                          |
|      "name": "John Doe",                   |
|      "email": "john@example.com"           |
|    },                                      |
|    {                                       |
|      "id": "456",                          |
|      "name": "Jane Smith",                 |
|      "email": "jane@example.com"           |
|    }                                       |
|  ]                                         |
|  ```                                       |
|                                            |
+--------------------------------------------+
```

## Search Interface

The search interface will provide advanced search capabilities with filters and highlighting.

```
+---------------------------------------------------------------+
|                                                               |
|  [Documentation] | Playground       Search: [users list_____] |
|                                                               |
+---------------------------------------------------------------+
|                                                               |
|  Search Results for "users list"                              |
|                                                               |
|  GET /api/users                                               |
|  Get a list of users with optional filtering and pagination.  |
|  Tags: Users                                                  |
|  ... Get a <mark>list</mark> of <mark>users</mark> with ...   |
|                                                               |
|  GET /api/admin/users                                         |
|  Get a list of all users (admin only).                        |
|  Tags: Admin, Users                                           |
|  ... Get a <mark>list</mark> of all <mark>users</mark> ...    |
|                                                               |
|  POST /api/users/search                                       |
|  Search for users by criteria.                                |
|  Tags: Users                                                  |
|  ... Search for <mark>users</mark> by criteria ...            |
|                                                               |
|  Filters:                                                     |
|  [x] GET [ ] POST [ ] PUT [ ] DELETE                          |
|  [x] Users [ ] Products [ ] Orders                            |
|                                                               |
+---------------------------------------------------------------+
```

## Interactive Examples

The documentation will include interactive examples that can be executed directly.

```
+--------------------------------------------+
|                                            |
|  Example Requests                          |
|  ================                          |
|                                            |
|  1. Get all users                          |
|     GET /api/users                         |
|     [Execute]                              |
|                                            |
|  2. Get users with pagination              |
|     GET /api/users?limit=5&offset=10       |
|     [Execute]                              |
|                                            |
|  3. Get users filtered by status           |
|     GET /api/users?status=active           |
|     [Execute]                              |
|                                            |
+--------------------------------------------+
```

## Related Endpoints

The documentation will show related endpoints to help users discover relevant APIs.

```
+--------------------------------------------+
|                                            |
|  Related Endpoints                         |
|  =================                         |
|                                            |
|  - POST /api/users                         |
|    Create a new user                       |
|                                            |
|  - GET /api/users/{id}                     |
|    Get a specific user by ID               |
|                                            |
|  - GET /api/users/{id}/orders              |
|    Get orders for a specific user          |
|                                            |
+--------------------------------------------+
```

## Mobile View

The documentation will be responsive and adapt to different screen sizes.

```
+---------------------------+
|                           |
| [Documentation|Playground]|
| Search: [____________]    |
|                           |
+---------------------------+
| < Endpoints | Details >   |
+---------------------------+
|                           |
| GET /api/users            |
| ======================    |
|                           |
| Description               |
| -----------               |
| Get a list of users with  |
| optional filtering and    |
| pagination.               |
|                           |
| Parameters                |
| ----------                |
| - limit (query, optional) |
|   Maximum number of users |
|   to return               |
|   Type: integer           |
|   Default: 10             |
|                           |
| [View in Playground]      |
|                           |
+---------------------------+
```

## Dark Theme

The documentation will support both light and dark themes.

```
+---------------------------------------------------------------+
|                                                               |
|  [Documentation] | Playground       Search: [____________]    |
|                                                               |
+---------------------------------------------------------------+
|                  |                                            |
|  API ENDPOINTS   |  GET /api/users                            |
|  +-----------+   |  =======================================   |
|  | Users     |   |                                            |
|  | - List    |   |  Description                               |
|  | - Get     |   |  -----------                               |
|  | - Create  |   |  Get a list of users with optional         |
|  | - Update  |   |  filtering and pagination.                 |
|  | - Delete  |   |                                            |
|  +-----------+   |  Parameters                                |
|  | Products  |   |  ----------                                |
|  | ...       |   |  - limit (query, optional): Maximum        |
|  +-----------+   |    number of users to return               |
|                  |    Type: integer                           |
|                  |    Default: 10                             |
|                  |                                            |
|                  |  - offset (query, optional): Number of     |
|                  |    users to skip                           |
|                  |    Type: integer                           |
|                  |    Default: 0                              |
|                  |                                            |
|                  |  [View in Playground]                      |
|                  |                                            |
+------------------+--------------------------------------------+
```

## Conclusion

These mockups provide a visual representation of the enhanced API Documentation feature. The design focuses on creating a clear, intuitive interface that helps users discover and understand APIs while maintaining the ability to test them in the Playground mode.
