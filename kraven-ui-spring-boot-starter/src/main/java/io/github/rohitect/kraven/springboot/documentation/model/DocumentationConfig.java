package io.github.rohitect.kraven.springboot.documentation.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the configuration for documentation.
 */
@Data
public class DocumentationConfig {
    
    /**
     * The title of the documentation.
     */
    private String title = "Service Documentation";
    
    /**
     * The description of the documentation.
     */
    private String description = "Documentation for the service";
    
    /**
     * The version of the documentation.
     */
    private String version = "1.0.0";
    
    /**
     * The groups in the documentation.
     */
    private List<DocumentationGroupConfig> groups = new ArrayList<>();
    
    /**
     * Configuration for a documentation group.
     */
    @Data
    public static class DocumentationGroupConfig {
        
        /**
         * The ID of the group.
         */
        private String id;
        
        /**
         * The title of the group.
         */
        private String title;
        
        /**
         * The description of the group.
         */
        private String description;
        
        /**
         * The path to the overview file for this group.
         */
        private String overviewPath;
        
        /**
         * The order of this group in the documentation.
         */
        private int order;
        
        /**
         * The icon for this group (optional).
         */
        private String icon;
        
        /**
         * The include patterns for files in this group.
         */
        private List<String> include = new ArrayList<>();
        
        /**
         * The exclude patterns for files in this group.
         */
        private List<String> exclude = new ArrayList<>();
    }
}
