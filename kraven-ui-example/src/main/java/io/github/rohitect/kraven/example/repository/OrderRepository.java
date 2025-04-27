package io.github.rohitect.kraven.example.repository;

import io.github.rohitect.kraven.example.model.Order;
import io.github.rohitect.kraven.springboot.businessflow.annotation.KravenTag;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Repository for managing orders in memory.
 * This is a mock repository for demonstration purposes.
 */
@Repository
public class OrderRepository {

    private final Map<Long, Order> orders = new HashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1001);

    /**
     * Find all orders.
     *
     * @return List of all orders
     */
    @KravenTag(tag = "order-management", description = "Repository method to find all orders", level = 4)
    public List<Order> findAll() {
        return new ArrayList<>(orders.values());
    }

    /**
     * Find an order by ID.
     *
     * @param id Order ID
     * @return Optional containing the order if found, empty otherwise
     */
    @KravenTag(tag = "order-details", description = "Repository method to find order by ID", level = 4)
    public Optional<Order> findById(Long id) {
        return Optional.ofNullable(orders.get(id));
    }

    /**
     * Save an order.
     *
     * @param order Order to save
     * @return Saved order with generated ID if new
     */
    @KravenTag(tag = "order-creation", description = "Repository method to save a new order", level = 4)
    public Order save(Order order) {
        if (order.getId() == null) {
            Long id = idGenerator.getAndIncrement();
            order.setId(id);
        }
        orders.put(order.getId(), order);
        return order;
    }

    /**
     * Delete an order by ID.
     *
     * @param id Order ID
     * @return true if deleted, false if not found
     */
    @KravenTag(tag = "order-deletion", description = "Repository method to delete an order", level = 4)
    public boolean deleteById(Long id) {
        return orders.remove(id) != null;
    }

    /**
     * Find orders by customer ID.
     *
     * @param customerId Customer ID
     * @return List of orders for the specified customer
     */
    public List<Order> findByCustomerId(Long customerId) {
        return orders.values().stream()
                .filter(order -> order.getCustomer().getId().equals(customerId))
                .collect(Collectors.toList());
    }

    /**
     * Find orders by status.
     *
     * @param status Order status
     * @return List of orders with the specified status
     */
    public List<Order> findByStatus(String status) {
        return orders.values().stream()
                .filter(order -> status.equals(order.getStatus()))
                .collect(Collectors.toList());
    }
}
