package io.github.rohitect.kraven.springboot.metrics.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Detailed information about a Spring configuration class.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpringConfigurationDetails {
    private String name;
    private String className;
    private String packageName;
    private List<String> beanMethods;
    private List<String> importedConfigurations;
    private List<String> tags;
    private String description;
    private boolean isAutoConfiguration;
}
