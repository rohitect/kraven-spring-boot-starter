package io.github.rohitect.kraven.example.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a customer in the system.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Customer information")
public class Customer {

    @Schema(description = "Unique identifier of the customer", example = "1")
    private Long id;

    @NotBlank
    @Schema(description = "First name of the customer", example = "John", required = true)
    private String firstName;

    @NotBlank
    @Schema(description = "Last name of the customer", example = "Doe", required = true)
    private String lastName;

    @Email
    @NotBlank
    @Schema(description = "Email address of the customer", example = "john.doe@example.com", required = true)
    private String email;

    @Pattern(regexp = "\\d{10}")
    @Schema(description = "Phone number of the customer (10 digits)", example = "1234567890")
    private String phoneNumber;

    @Schema(description = "Address of the customer", example = "123 Main St, City, Country")
    private String address;

    @Schema(description = "Whether the customer is active", example = "true")
    private boolean active;
}
