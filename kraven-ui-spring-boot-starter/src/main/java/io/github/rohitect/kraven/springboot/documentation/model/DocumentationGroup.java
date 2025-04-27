package io.github.rohitect.kraven.springboot.documentation.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a group of documentation files.
 */
@Data
public class DocumentationGroup {
    
    /**
     * The unique identifier of the documentation group.
     */
    private String id;
    
    /**
     * The title of the documentation group.
     */
    private String title;
    
    /**
     * The description of the documentation group.
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
     * The files in this group.
     */
    private List<DocumentationFile> files = new ArrayList<>();
    
    /**
     * The overview file for this group.
     */
    private DocumentationFile overview;
}
