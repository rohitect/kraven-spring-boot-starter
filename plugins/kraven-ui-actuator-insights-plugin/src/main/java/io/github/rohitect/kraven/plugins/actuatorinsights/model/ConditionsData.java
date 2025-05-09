package io.github.rohitect.kraven.plugins.actuatorinsights.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.Map;

/**
 * Data model for conditions evaluation report data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConditionsData {
    
    /**
     * The timestamp when the conditions data was recorded.
     */
    private Date timestamp;
    
    /**
     * The full conditions data.
     */
    private Map<String, Object> details;
}
