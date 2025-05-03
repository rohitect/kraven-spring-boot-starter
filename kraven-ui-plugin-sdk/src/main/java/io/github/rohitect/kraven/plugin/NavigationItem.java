package io.github.rohitect.kraven.plugin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a navigation item in the UI.
 * This will be displayed in the header navigation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationItem {
    
    /**
     * The unique identifier for the navigation item.
     * This should be a simple, lowercase string with no spaces.
     */
    private String id;
    
    /**
     * The human-readable label for the navigation item.
     * This will be displayed in the UI.
     */
    private String label;
}
