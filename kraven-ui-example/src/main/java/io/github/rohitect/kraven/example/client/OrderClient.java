package io.github.rohitect.kraven.example.client;

import io.github.rohitect.kraven.example.model.Order;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Feign client for the Order API.
 */
@FeignClient(name = "orderClient", url = "${app.api.base-url:http://localhost:8081}", path = "/api/orders", configuration = io.github.rohitect.kraven.example.config.FeignClientConfig.class)
public interface OrderClient {

    /**
     * Get all orders.
     *
     * @return List of all orders
     */
    @GetMapping
    ResponseEntity<List<Order>> getAllOrders();

    /**
     * Get an order by ID.
     *
     * @param id Order ID
     * @return Order if found
     */
    @GetMapping("/{id}")
    ResponseEntity<Order> getOrderById(@PathVariable("id") Long id);

    /**
     * Create a new order.
     *
     * @param order Order to create
     * @return Created order
     */
    @PostMapping
    ResponseEntity<Order> createOrder(@RequestBody Order order);

    /**
     * Update an existing order.
     *
     * @param id Order ID
     * @param order Updated order data
     * @return Updated order
     */
    @PutMapping("/{id}")
    ResponseEntity<Order> updateOrder(@PathVariable("id") Long id, @RequestBody Order order);

    /**
     * Delete an order by ID.
     *
     * @param id Order ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteOrder(@PathVariable("id") Long id);

    /**
     * Get orders by customer ID.
     *
     * @param customerId Customer ID
     * @return List of orders for the customer
     */
    @GetMapping("/customer/{customerId}")
    ResponseEntity<List<Order>> getOrdersByCustomerId(@PathVariable("customerId") Long customerId);

    /**
     * Get orders by status.
     *
     * @param status Order status
     * @return List of orders with the status
     */
    @GetMapping("/status/{status}")
    ResponseEntity<List<Order>> getOrdersByStatus(@PathVariable("status") String status);

    /**
     * Update the status of an order.
     *
     * @param id Order ID
     * @param statusUpdate Map containing the new status
     * @return Updated order
     */
    @PatchMapping("/{id}/status")
    ResponseEntity<Order> updateOrderStatus(@PathVariable("id") Long id, @RequestBody Map<String, String> statusUpdate);
}
