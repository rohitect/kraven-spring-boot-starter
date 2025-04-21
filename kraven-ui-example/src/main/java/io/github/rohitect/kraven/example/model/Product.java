package io.github.rohitect.kraven.example.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Represents a product in the system.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Product information")
public class Product {

    @Schema(description = "Unique identifier of the product", example = "1")
    private Long id;

    @NotBlank
    @Schema(description = "Name of the product", example = "Smartphone", required = true)
    private String name;

    @Schema(description = "Description of the product", example = "Latest model with high-end features")
    private String description;

    @NotNull
    @Min(0)
    @Schema(description = "Price of the product", example = "999.99", required = true)
    private BigDecimal price;

    @Min(0)
    @Schema(description = "Available quantity in stock", example = "50")
    private Integer stockQuantity;

    @Schema(description = "Category of the product", example = "Electronics")
    private String category;

    @Schema(description = "Whether the product is available for sale", example = "true")
    private boolean available;
}
