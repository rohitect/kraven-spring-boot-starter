package io.github.rohitect.kraven.springboot.metrics.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Detailed information about a Spring repository.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpringRepositoryDetails {
    private String name;
    private String className;
    private String packageName;
    private String entityClass;
    private String repositoryType; // JPA, JDBC, MongoDB, etc.
    private List<String> methods;
    private List<String> tags;
    private String description;
}
