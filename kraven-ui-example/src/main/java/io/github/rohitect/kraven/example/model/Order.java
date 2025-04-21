package io.github.rohitect.kraven.example.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents an order in the system.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Order information")
public class Order {

    @Schema(description = "Unique identifier of the order", example = "1001")
    private Long id;

    @NotNull
    @Schema(description = "Customer who placed the order", required = true)
    private Customer customer;

    @NotEmpty
    @Schema(description = "List of items in the order", required = true)
    private List<OrderItem> items;

    @Schema(description = "Total amount of the order", example = "1299.99")
    private BigDecimal totalAmount;

    @Schema(description = "Date and time when the order was placed", example = "2023-06-15T14:30:00")
    private LocalDateTime orderDate;

    @Schema(description = "Current status of the order", example = "PROCESSING", 
            allowableValues = {"PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"})
    private String status;

    @Schema(description = "Shipping address for the order", example = "123 Main St, City, Country")
    private String shippingAddress;

    @Schema(description = "Payment method used for the order", example = "CREDIT_CARD",
            allowableValues = {"CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER"})
    private String paymentMethod;

    /**
     * Represents an item in an order.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Order item information")
    public static class OrderItem {

        @NotNull
        @Schema(description = "Product in the order", required = true)
        private Product product;

        @NotNull
        @Schema(description = "Quantity of the product", example = "2", required = true)
        private Integer quantity;

        @Schema(description = "Price of the product at the time of order", example = "999.99")
        private BigDecimal price;

        @Schema(description = "Total price for this item (price * quantity)", example = "1999.98")
        private BigDecimal totalPrice;
    }
}
