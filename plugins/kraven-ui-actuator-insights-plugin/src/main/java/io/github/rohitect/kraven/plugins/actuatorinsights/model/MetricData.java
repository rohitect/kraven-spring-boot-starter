package io.github.rohitect.kraven.plugins.actuatorinsights.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * Data model for metric data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MetricData {
    
    /**
     * The name of the metric.
     */
    private String name;
    
    /**
     * The value of the metric.
     */
    private Double value;
    
    /**
     * The timestamp when the metric was recorded.
     */
    private Date timestamp;
    
    /**
     * The description of the metric.
     */
    private String description;
    
    /**
     * The base unit of the metric.
     */
    private String baseUnit;
}
