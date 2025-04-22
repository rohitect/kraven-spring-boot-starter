package io.github.rohitect.kraven.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.License;

/**
 * Main application class for the Kraven UI Example application.
 * This application demonstrates the features of Kraven UI.
 */
@SpringBootApplication
@EnableFeignClients(basePackages = "io.github.rohitect.kraven.example.client")
@OpenAPIDefinition(
    info = @Info(
        title = "Kraven UI Example API",
        version = "1.0.0",
        description = "Example API demonstrating Kraven UI features",
        contact = @Contact(
            name = "Rohit Ranjan",
            email = "rohit@example.com",
            url = "https://github.com/rohitect"
        ),
        license = @License(
            name = "Apache 2.0",
            url = "https://www.apache.org/licenses/LICENSE-2.0.html"
        )
    )
)
public class KravenUiExampleApplication {

    public static void main(String[] args) {
        SpringApplication.run(KravenUiExampleApplication.class, args);
    }
}
