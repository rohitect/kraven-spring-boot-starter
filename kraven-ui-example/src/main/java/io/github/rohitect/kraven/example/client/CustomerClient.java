package io.github.rohitect.kraven.example.client;

import io.github.rohitect.kraven.example.model.Customer;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feign client for the Customer API.
 */
@FeignClient(name = "customerClient", url = "${app.api.base-url:http://localhost:8080}", path = "/api/customers")
public interface CustomerClient {

    /**
     * Get all customers.
     *
     * @return List of all customers
     */
    @GetMapping
    ResponseEntity<List<Customer>> getAllCustomers();

    /**
     * Get a customer by ID.
     *
     * @param id Customer ID
     * @return Customer if found
     */
    @GetMapping("/{id}")
    ResponseEntity<Customer> getCustomerById(@PathVariable("id") Long id);

    /**
     * Create a new customer.
     *
     * @param customer Customer to create
     * @return Created customer
     */
    @PostMapping
    ResponseEntity<Customer> createCustomer(@RequestBody Customer customer);

    /**
     * Update an existing customer.
     *
     * @param id Customer ID
     * @param customer Updated customer data
     * @return Updated customer
     */
    @PutMapping("/{id}")
    ResponseEntity<Customer> updateCustomer(@PathVariable("id") Long id, @RequestBody Customer customer);

    /**
     * Delete a customer by ID.
     *
     * @param id Customer ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteCustomer(@PathVariable("id") Long id);

    /**
     * Get active customers.
     *
     * @return List of active customers
     */
    @GetMapping("/active")
    ResponseEntity<List<Customer>> getActiveCustomers();

    /**
     * Search customers by name or email.
     *
     * @param query Search query
     * @return List of matching customers
     */
    @GetMapping("/search")
    ResponseEntity<List<Customer>> searchCustomers(@RequestParam("query") String query);
}
