# Features

This section provides an overview of the key features of the Kraven Example service.

## API Documentation

Kraven provides a rich API documentation interface with a playground for testing API endpoints. The documentation is automatically generated from Spring REST controllers and includes:

- Endpoint details (path, method, parameters)
- Request and response schemas
- Try-it-out functionality
- Authentication support

## Feign Client Explorer

The Feign Client Explorer allows developers to:

- View all Feign clients in the application
- See the methods and parameters for each client
- Test Feign client methods directly from the UI
- View request and response details

## Kafka Management

Kraven's Kafka Management feature provides:

- Topic listing and details
- Message viewing and filtering
- Producer interface for sending test messages
- Consumer group information

## Documentation

The Documentation feature (which you're using right now!) provides:

- Markdown-based documentation
- Support for Mermaid diagrams
- Business flow visualization
- Organized documentation with groups and files

### Business Flow Example

Here's another example of a business flow:

```businessflow OrderProcessing "Order Processing Flow"
- io.github.rohitect.example.controller.OrderController.createOrder: Receives order creation request
- io.github.rohitect.example.service.OrderService.processOrder: Validates and processes order
- io.github.rohitect.example.service.InventoryService.checkAvailability: Checks product availability
- io.github.rohitect.example.service.PaymentService.processPayment: Processes payment
- io.github.rohitect.example.repository.OrderRepository.save: Persists order to database
- io.github.rohitect.example.kafka.OrderEventProducer.publishOrderCreatedEvent: Publishes order created event
```
