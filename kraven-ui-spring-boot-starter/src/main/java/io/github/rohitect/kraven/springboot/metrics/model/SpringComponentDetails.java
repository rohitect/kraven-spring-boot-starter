package io.github.rohitect.kraven.springboot.metrics.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Detailed information about a Spring component.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpringComponentDetails {
    private String name;
    private String className;
    private String packageName;
    private List<String> dependencies;
    private List<String> tags;
    private String description;
}
