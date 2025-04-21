package io.github.rohitect.kraven.example.service;

import io.github.rohitect.kraven.example.model.Customer;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service for managing customers.
 */
@Service
public class CustomerService {

    private final Map<Long, Customer> customers = new HashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    /**
     * Constructor that initializes some sample customers.
     */
    public CustomerService() {
        // Add some sample customers
        createCustomer(Customer.builder()
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .phoneNumber("1234567890")
                .address("123 Main St, City, Country")
                .active(true)
                .build());

        createCustomer(Customer.builder()
                .firstName("Jane")
                .lastName("Smith")
                .email("jane.smith@example.com")
                .phoneNumber("9876543210")
                .address("456 Oak Ave, Town, Country")
                .active(true)
                .build());

        createCustomer(Customer.builder()
                .firstName("Michael")
                .lastName("Johnson")
                .email("michael.johnson@example.com")
                .phoneNumber("5551234567")
                .address("789 Pine Rd, Village, Country")
                .active(true)
                .build());

        createCustomer(Customer.builder()
                .firstName("Emily")
                .lastName("Brown")
                .email("emily.brown@example.com")
                .phoneNumber("3334445555")
                .address("101 Cedar Ln, Suburb, Country")
                .active(false)
                .build());

        createCustomer(Customer.builder()
                .firstName("David")
                .lastName("Wilson")
                .email("david.wilson@example.com")
                .phoneNumber("7778889999")
                .address("202 Maple Dr, City, Country")
                .active(true)
                .build());
    }

    /**
     * Get all customers.
     *
     * @return List of all customers
     */
    public List<Customer> getAllCustomers() {
        return new ArrayList<>(customers.values());
    }

    /**
     * Get a customer by ID.
     *
     * @param id Customer ID
     * @return Optional containing the customer if found, empty otherwise
     */
    public Optional<Customer> getCustomerById(Long id) {
        return Optional.ofNullable(customers.get(id));
    }

    /**
     * Create a new customer.
     *
     * @param customer Customer to create
     * @return Created customer with generated ID
     */
    public Customer createCustomer(Customer customer) {
        Long id = idGenerator.getAndIncrement();
        customer.setId(id);
        customers.put(id, customer);
        return customer;
    }

    /**
     * Update an existing customer.
     *
     * @param id Customer ID
     * @param customer Updated customer data
     * @return Updated customer if found, null otherwise
     */
    public Customer updateCustomer(Long id, Customer customer) {
        if (customers.containsKey(id)) {
            customer.setId(id);
            customers.put(id, customer);
            return customer;
        }
        return null;
    }

    /**
     * Delete a customer by ID.
     *
     * @param id Customer ID
     * @return true if deleted, false if not found
     */
    public boolean deleteCustomer(Long id) {
        return customers.remove(id) != null;
    }

    /**
     * Get active customers.
     *
     * @return List of active customers
     */
    public List<Customer> getActiveCustomers() {
        return customers.values().stream()
                .filter(Customer::isActive)
                .toList();
    }

    /**
     * Search customers by name or email.
     *
     * @param query Search query
     * @return List of customers matching the search query
     */
    public List<Customer> searchCustomers(String query) {
        String lowercaseQuery = query.toLowerCase();
        return customers.values().stream()
                .filter(customer -> 
                    (customer.getFirstName() != null && customer.getFirstName().toLowerCase().contains(lowercaseQuery)) ||
                    (customer.getLastName() != null && customer.getLastName().toLowerCase().contains(lowercaseQuery)) ||
                    (customer.getEmail() != null && customer.getEmail().toLowerCase().contains(lowercaseQuery)))
                .toList();
    }
}
