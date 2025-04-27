package io.github.rohitect.kraven.example.service;

import io.github.rohitect.kraven.example.model.Customer;
import io.github.rohitect.kraven.example.model.Order;
import io.github.rohitect.kraven.example.model.Order.OrderItem;
import io.github.rohitect.kraven.example.model.Product;
import io.github.rohitect.kraven.springboot.businessflow.annotation.KravenTag;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing orders.
 */
@Service
public class OrderService {

    private final CustomerService customerService;
    private final ProductService productService;
    private final io.github.rohitect.kraven.example.repository.OrderRepository orderRepository;

    /**
     * Constructor that initializes the service and creates sample orders.
     *
     * @param customerService Customer service
     * @param productService Product service
     * @param orderRepository Order repository
     */
    public OrderService(CustomerService customerService, ProductService productService,
                        io.github.rohitect.kraven.example.repository.OrderRepository orderRepository) {
        this.customerService = customerService;
        this.productService = productService;
        this.orderRepository = orderRepository;

        // Create some sample orders
        createSampleOrders();
    }

    /**
     * Create sample orders for demonstration.
     */
    private void createSampleOrders() {
        List<Customer> customers = customerService.getAllCustomers();
        List<Product> products = productService.getAllProducts();

        if (customers.isEmpty() || products.isEmpty()) {
            return;
        }

        // Order 1
        Customer customer1 = customers.get(0);
        List<OrderItem> items1 = new ArrayList<>();
        items1.add(new OrderItem(products.get(0), 1, products.get(0).getPrice(), products.get(0).getPrice()));
        items1.add(new OrderItem(products.get(2), 2, products.get(2).getPrice(),
                products.get(2).getPrice().multiply(BigDecimal.valueOf(2))));

        BigDecimal totalAmount1 = items1.stream()
                .map(OrderItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order1 = Order.builder()
                .customer(customer1)
                .items(items1)
                .totalAmount(totalAmount1)
                .orderDate(LocalDateTime.now().minusDays(5))
                .status("DELIVERED")
                .shippingAddress(customer1.getAddress())
                .paymentMethod("CREDIT_CARD")
                .build();

        createOrder(order1);

        // Order 2
        Customer customer2 = customers.get(1);
        List<OrderItem> items2 = new ArrayList<>();
        items2.add(new OrderItem(products.get(1), 1, products.get(1).getPrice(), products.get(1).getPrice()));

        BigDecimal totalAmount2 = items2.stream()
                .map(OrderItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order2 = Order.builder()
                .customer(customer2)
                .items(items2)
                .totalAmount(totalAmount2)
                .orderDate(LocalDateTime.now().minusDays(2))
                .status("SHIPPED")
                .shippingAddress(customer2.getAddress())
                .paymentMethod("PAYPAL")
                .build();

        createOrder(order2);

        // Order 3
        Customer customer3 = customers.get(2);
        List<OrderItem> items3 = new ArrayList<>();
        items3.add(new OrderItem(products.get(3), 1, products.get(3).getPrice(), products.get(3).getPrice()));
        items3.add(new OrderItem(products.get(4), 1, products.get(4).getPrice(), products.get(4).getPrice()));

        BigDecimal totalAmount3 = items3.stream()
                .map(OrderItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order3 = Order.builder()
                .customer(customer3)
                .items(items3)
                .totalAmount(totalAmount3)
                .orderDate(LocalDateTime.now().minusHours(12))
                .status("PROCESSING")
                .shippingAddress(customer3.getAddress())
                .paymentMethod("DEBIT_CARD")
                .build();

        createOrder(order3);
    }

    /**
     * Get all orders.
     *
     * @return List of all orders
     */
    @KravenTag(tag = "order-management", description = "Service method to retrieve all orders", level = 2)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    /**
     * Get an order by ID.
     *
     * @param id Order ID
     * @return Optional containing the order if found, empty otherwise
     */
    @KravenTag(tag = "order-details", description = "Service method to retrieve order by ID", level = 2)
    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }

    /**
     * Create a new order.
     *
     * @param order Order to create
     * @return Created order with generated ID
     */
    @KravenTag(tag = "order-creation", description = "Service method to create a new order", level = 2)
    public Order createOrder(Order order) {
        // Calculate total amount if not provided
        if (order.getTotalAmount() == null) {
            BigDecimal totalAmount = order.getItems().stream()
                    .map(OrderItem::getTotalPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            order.setTotalAmount(totalAmount);
        }

        // Set order date if not provided
        if (order.getOrderDate() == null) {
            order.setOrderDate(LocalDateTime.now());
        }

        // Set initial status if not provided
        if (order.getStatus() == null) {
            order.setStatus("PENDING");
        }

        return orderRepository.save(order);
    }

    /**
     * Update an existing order.
     *
     * @param id Order ID
     * @param order Updated order data
     * @return Updated order if found, null otherwise
     */
    @KravenTag(tag = "order-update", description = "Service method to update an order", level = 2)
    public Order updateOrder(Long id, Order order) {
        if (orderRepository.findById(id).isPresent()) {
            order.setId(id);
            return orderRepository.save(order);
        }
        return null;
    }

    /**
     * Delete an order by ID.
     *
     * @param id Order ID
     * @return true if deleted, false if not found
     */
    @KravenTag(tag = "order-deletion", description = "Service method to delete an order", level = 2)
    public boolean deleteOrder(Long id) {
        return orderRepository.deleteById(id);
    }

    /**
     * Get orders by customer ID.
     *
     * @param customerId Customer ID
     * @return List of orders for the specified customer
     */
    public List<Order> getOrdersByCustomerId(Long customerId) {
        return orderRepository.findByCustomerId(customerId);
    }

    /**
     * Get orders by status.
     *
     * @param status Order status
     * @return List of orders with the specified status
     */
    public List<Order> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status);
    }

    /**
     * Update the status of an order.
     *
     * @param id Order ID
     * @param status New status
     * @return Updated order if found, null otherwise
     */
    public Order updateOrderStatus(Long id, String status) {
        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setStatus(status);
            return orderRepository.save(order);
        }
        return null;
    }
}
