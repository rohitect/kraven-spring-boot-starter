package io.github.rohitect.kraven.example.service;

import io.github.rohitect.kraven.example.model.Product;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service for managing products.
 */
@Service
public class ProductService {

    private final Map<Long, Product> products = new HashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    /**
     * Constructor that initializes some sample products.
     */
    public ProductService() {
        // Add some sample products
        createProduct(Product.builder()
                .name("Smartphone")
                .description("Latest model with high-end features")
                .price(new BigDecimal("999.99"))
                .stockQuantity(50)
                .category("Electronics")
                .available(true)
                .build());

        createProduct(Product.builder()
                .name("Laptop")
                .description("Powerful laptop for professionals")
                .price(new BigDecimal("1499.99"))
                .stockQuantity(30)
                .category("Electronics")
                .available(true)
                .build());

        createProduct(Product.builder()
                .name("Headphones")
                .description("Noise-cancelling wireless headphones")
                .price(new BigDecimal("299.99"))
                .stockQuantity(100)
                .category("Electronics")
                .available(true)
                .build());

        createProduct(Product.builder()
                .name("Coffee Maker")
                .description("Automatic coffee maker with timer")
                .price(new BigDecimal("149.99"))
                .stockQuantity(20)
                .category("Home Appliances")
                .available(true)
                .build());

        createProduct(Product.builder()
                .name("Fitness Tracker")
                .description("Track your fitness activities and health metrics")
                .price(new BigDecimal("129.99"))
                .stockQuantity(75)
                .category("Wearables")
                .available(true)
                .build());
    }

    /**
     * Get all products.
     *
     * @return List of all products
     */
    public List<Product> getAllProducts() {
        return new ArrayList<>(products.values());
    }

    /**
     * Get a product by ID.
     *
     * @param id Product ID
     * @return Optional containing the product if found, empty otherwise
     */
    public Optional<Product> getProductById(Long id) {
        return Optional.ofNullable(products.get(id));
    }

    /**
     * Create a new product.
     *
     * @param product Product to create
     * @return Created product with generated ID
     */
    public Product createProduct(Product product) {
        Long id = idGenerator.getAndIncrement();
        product.setId(id);
        products.put(id, product);
        return product;
    }

    /**
     * Update an existing product.
     *
     * @param id Product ID
     * @param product Updated product data
     * @return Updated product if found, null otherwise
     */
    public Product updateProduct(Long id, Product product) {
        if (products.containsKey(id)) {
            product.setId(id);
            products.put(id, product);
            return product;
        }
        return null;
    }

    /**
     * Delete a product by ID.
     *
     * @param id Product ID
     * @return true if deleted, false if not found
     */
    public boolean deleteProduct(Long id) {
        return products.remove(id) != null;
    }

    /**
     * Get products by category.
     *
     * @param category Category to filter by
     * @return List of products in the specified category
     */
    public List<Product> getProductsByCategory(String category) {
        return products.values().stream()
                .filter(product -> category.equals(product.getCategory()))
                .toList();
    }

    /**
     * Search products by name or description.
     *
     * @param query Search query
     * @return List of products matching the search query
     */
    public List<Product> searchProducts(String query) {
        String lowercaseQuery = query.toLowerCase();
        return products.values().stream()
                .filter(product -> 
                    (product.getName() != null && product.getName().toLowerCase().contains(lowercaseQuery)) ||
                    (product.getDescription() != null && product.getDescription().toLowerCase().contains(lowercaseQuery)))
                .toList();
    }
}
