# Architecture

This section provides detailed information about the architecture of the Kraven Example service.

## System Architecture

The Kraven Example service follows a layered architecture pattern:

```mermaid
graph TD
    A[Client] -->|HTTP Request| B[Controller Layer]
    B --> C[Service Layer]
    C --> D[Repository Layer]
    C --> E[External Services]
    E -->|Feign Client| F[External API]
    C --> G[Kafka Producer]
    G --> H[Kafka Broker]
    I[Kafka Consumer] --> H
    I --> J[Message Processor]
    
    style B fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
```

## Component Diagram

Here's a more detailed component diagram:

```mermaid
graph TD
    subgraph "Controller Layer"
        A[UserController]
        B[OrderController]
        C[ProductController]
    end
    
    subgraph "Service Layer"
        D[UserService]
        E[OrderService]
        F[ProductService]
        G[PaymentService]
        H[NotificationService]
    end
    
    subgraph "Repository Layer"
        I[UserRepository]
        J[OrderRepository]
        K[ProductRepository]
    end
    
    subgraph "External Services"
        L[PaymentGateway]
        M[EmailService]
    end
    
    subgraph "Kafka"
        N[UserEventProducer]
        O[OrderEventProducer]
        P[UserEventConsumer]
        Q[OrderEventConsumer]
    end
    
    A --> D
    B --> E
    C --> F
    
    D --> I
    E --> J
    F --> K
    
    E --> G
    D --> H
    E --> H
    
    G --> L
    H --> M
    
    D --> N
    E --> O
    P --> D
    Q --> E
```

## Data Flow

Here's an example of the data flow for the order processing:

```businessflow OrderProcessingDetailed "Detailed Order Processing Flow"
- io.github.rohitect.example.controller.OrderController.createOrder: Receives order creation request with product IDs and quantities
- io.github.rohitect.example.service.OrderService.validateOrder: Validates order details and customer information
- io.github.rohitect.example.service.ProductService.getProductDetails: Retrieves product details for the order
- io.github.rohitect.example.service.InventoryService.checkAvailability: Checks if products are in stock
- io.github.rohitect.example.service.PricingService.calculateTotal: Calculates order total with discounts
- io.github.rohitect.example.service.PaymentService.processPayment: Processes payment through payment gateway
- io.github.rohitect.example.service.OrderService.createOrderRecord: Creates order record with line items
- io.github.rohitect.example.repository.OrderRepository.save: Persists order to database
- io.github.rohitect.example.service.InventoryService.updateInventory: Updates inventory levels
- io.github.rohitect.example.service.NotificationService.sendOrderConfirmation: Sends order confirmation to customer
- io.github.rohitect.example.kafka.OrderEventProducer.publishOrderCreatedEvent: Publishes order created event for downstream processing
```

## Sequence Diagram

Here's a sequence diagram for the user registration process:

```mermaid
sequenceDiagram
    participant Client
    participant UserController
    participant UserService
    participant UserRepository
    participant NotificationService
    participant KafkaProducer
    
    Client->>UserController: POST /users (Registration Data)
    UserController->>UserService: createUser(userData)
    UserService->>UserService: validateUserData()
    UserService->>UserRepository: findByEmail(email)
    UserRepository-->>UserService: null (user doesn't exist)
    UserService->>UserService: hashPassword()
    UserService->>UserRepository: save(user)
    UserRepository-->>UserService: savedUser
    UserService->>NotificationService: sendWelcomeEmail(user)
    NotificationService-->>UserService: emailSent
    UserService->>KafkaProducer: publishUserCreatedEvent(user)
    KafkaProducer-->>UserService: eventPublished
    UserService-->>UserController: userDTO
    UserController-->>Client: 201 Created (User Data)
```
