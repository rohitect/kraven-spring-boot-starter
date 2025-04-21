# Kraven UI Example

This module provides a complete example application demonstrating the features of Kraven UI. It includes sample REST APIs and Feign clients to showcase the API documentation and Feign client explorer capabilities.

## Features

- Sample REST APIs with proper OpenAPI documentation
- Sample Feign clients for demonstrating the Feign client explorer
- Complete Spring Boot application setup
- Configuration examples for Kraven UI

## Getting Started

### Prerequisites

- Java 17 or higher
- Maven 3.6 or higher

### Running the Application

To run the example application, use the following command:

```bash
mvn spring-boot:run
```

The application will start on port 8080 by default. You can access the Kraven UI at:

```
http://localhost:8080/kraven
```

## API Documentation

The example application includes the following APIs:

### Products API

- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get a product by ID
- `POST /api/products` - Create a new product
- `PUT /api/products/{id}` - Update a product
- `DELETE /api/products/{id}` - Delete a product
- `GET /api/products/category/{category}` - Get products by category
- `GET /api/products/search?query={query}` - Search products

### Customers API

- `GET /api/customers` - Get all customers
- `GET /api/customers/{id}` - Get a customer by ID
- `POST /api/customers` - Create a new customer
- `PUT /api/customers/{id}` - Update a customer
- `DELETE /api/customers/{id}` - Delete a customer
- `GET /api/customers/active` - Get active customers
- `GET /api/customers/search?query={query}` - Search customers

### Orders API

- `GET /api/orders` - Get all orders
- `GET /api/orders/{id}` - Get an order by ID
- `POST /api/orders` - Create a new order
- `PUT /api/orders/{id}` - Update an order
- `DELETE /api/orders/{id}` - Delete an order
- `GET /api/orders/customer/{customerId}` - Get orders by customer
- `GET /api/orders/status/{status}` - Get orders by status
- `PATCH /api/orders/{id}/status` - Update order status

## Feign Clients

The example application includes the following Feign clients:

- `ProductClient` - Client for the Products API
- `CustomerClient` - Client for the Customers API
- `OrderClient` - Client for the Orders API

These clients can be explored using the Feign Client Explorer feature of Kraven UI.

## Configuration

The application is configured using `application.yml`. Key configuration properties include:

```yaml
kraven:
  ui:
    path: /kraven
    theme:
      primary-color: "#1976d2"
      secondary-color: "#424242"
      font-family: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"
    layout:
      type: "three-pane"
    feign-client:
      enabled: true
```

## Note

This example module is not included in the release distribution of Kraven UI. It is intended for demonstration and testing purposes only.
