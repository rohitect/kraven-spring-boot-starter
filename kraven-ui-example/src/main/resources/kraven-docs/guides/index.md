# Guides

This section provides how-to guides for common tasks in the Kraven Example service.

## Adding a New API Endpoint

To add a new API endpoint to the service:

1. Create a new controller method in the appropriate controller class:

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    
    private final ProductService productService;
    
    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProduct(@PathVariable Long id) {
        ProductDTO product = productService.getProduct(id);
        return ResponseEntity.ok(product);
    }
    
    // Add your new endpoint here
    @PostMapping("/search")
    public ResponseEntity<List<ProductDTO>> searchProducts(@RequestBody ProductSearchRequest request) {
        List<ProductDTO> products = productService.searchProducts(request);
        return ResponseEntity.ok(products);
    }
}
```

2. Implement the corresponding service method:

```java
@Service
public class ProductService {
    
    private final ProductRepository productRepository;
    
    @Autowired
    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }
    
    // Add your new service method here
    public List<ProductDTO> searchProducts(ProductSearchRequest request) {
        // Implement search logic
        List<Product> products = productRepository.findByNameContainingAndCategoryIn(
            request.getQuery(), 
            request.getCategories()
        );
        
        return products.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    private ProductDTO mapToDTO(Product product) {
        // Mapping logic
        return new ProductDTO(
            product.getId(),
            product.getName(),
            product.getDescription(),
            product.getPrice(),
            product.getCategory()
        );
    }
}
```

3. Create any necessary DTOs:

```java
public class ProductSearchRequest {
    private String query;
    private List<String> categories;
    
    // Getters and setters
}
```

4. Add repository methods if needed:

```java
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByNameContainingAndCategoryIn(String name, List<String> categories);
}
```

## Creating a Business Flow

To create a business flow that can be visualized in the documentation:

1. Add `@KravenTag` annotations to the methods involved in the flow:

```java
@Service
public class OrderService {
    
    @KravenTag("OrderProcessing")
    public OrderDTO processOrder(OrderRequest request) {
        // Order processing logic
    }
}
```

2. Add a business flow tag in your documentation:

```markdown
## Order Processing Flow

```businessflow OrderProcessing "Order Processing Flow"
- io.github.rohitect.example.controller.OrderController.createOrder: Receives order creation request
- io.github.rohitect.example.service.OrderService.processOrder: Validates and processes order
- io.github.rohitect.example.service.InventoryService.checkAvailability: Checks product availability
- io.github.rohitect.example.service.PaymentService.processPayment: Processes payment
- io.github.rohitect.example.repository.OrderRepository.save: Persists order to database
```

## Adding Kafka Producers and Consumers

To add a new Kafka producer:

```java
@Service
public class OrderEventProducer {
    
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;
    
    @Autowired
    public OrderEventProducer(KafkaTemplate<String, OrderEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    public void publishOrderCreatedEvent(Order order) {
        OrderEvent event = new OrderEvent(
            "ORDER_CREATED",
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            LocalDateTime.now()
        );
        
        kafkaTemplate.send("order-events", order.getId().toString(), event);
    }
}
```

To add a new Kafka consumer:

```java
@Service
public class OrderEventConsumer {
    
    private final OrderService orderService;
    
    @Autowired
    public OrderEventConsumer(OrderService orderService) {
        this.orderService = orderService;
    }
    
    @KafkaListener(topics = "order-events", groupId = "order-processing-group")
    public void consumeOrderEvent(OrderEvent event) {
        if ("ORDER_CREATED".equals(event.getType())) {
            orderService.processOrderCreatedEvent(event);
        }
    }
}
```
