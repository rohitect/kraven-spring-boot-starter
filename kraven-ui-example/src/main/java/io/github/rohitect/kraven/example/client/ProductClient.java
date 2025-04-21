package io.github.rohitect.kraven.example.client;

import io.github.rohitect.kraven.example.model.Product;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feign client for the Product API.
 */
@FeignClient(name = "productClient", url = "${app.api.base-url:http://localhost:8080}", path = "/api/products")
public interface ProductClient {

    /**
     * Get all products.
     *
     * @return List of all products
     */
    @GetMapping
    ResponseEntity<List<Product>> getAllProducts();

    /**
     * Get a product by ID.
     *
     * @param id Product ID
     * @return Product if found
     */
    @GetMapping("/{id}")
    ResponseEntity<Product> getProductById(@PathVariable("id") Long id);

    /**
     * Create a new product.
     *
     * @param product Product to create
     * @return Created product
     */
    @PostMapping
    ResponseEntity<Product> createProduct(@RequestBody Product product);

    /**
     * Update an existing product.
     *
     * @param id Product ID
     * @param product Updated product data
     * @return Updated product
     */
    @PutMapping("/{id}")
    ResponseEntity<Product> updateProduct(@PathVariable("id") Long id, @RequestBody Product product);

    /**
     * Delete a product by ID.
     *
     * @param id Product ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteProduct(@PathVariable("id") Long id);

    /**
     * Get products by category.
     *
     * @param category Category to filter by
     * @return List of products in the category
     */
    @GetMapping("/category/{category}")
    ResponseEntity<List<Product>> getProductsByCategory(@PathVariable("category") String category);

    /**
     * Search products by name or description.
     *
     * @param query Search query
     * @return List of matching products
     */
    @GetMapping("/search")
    ResponseEntity<List<Product>> searchProducts(@RequestParam("query") String query);
}
