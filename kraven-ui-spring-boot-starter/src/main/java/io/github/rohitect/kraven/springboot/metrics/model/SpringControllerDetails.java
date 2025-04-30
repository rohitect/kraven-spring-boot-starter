package io.github.rohitect.kraven.springboot.metrics.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Detailed information about a Spring controller.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpringControllerDetails {
    private String name;
    private String className;
    private String packageName;
    private String baseUrl;
    private List<String> requestMappings;
    private List<String> dependencies;
    private List<String> tags;
    private String description;
    private boolean isRestController;
}
