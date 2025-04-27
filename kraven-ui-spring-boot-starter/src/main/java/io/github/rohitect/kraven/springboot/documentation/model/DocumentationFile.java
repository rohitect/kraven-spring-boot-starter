package io.github.rohitect.kraven.springboot.documentation.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Represents a documentation file.
 */
@Data
public class DocumentationFile {

    /**
     * The unique identifier of the documentation file.
     */
    private String id;

    /**
     * The title of the documentation file.
     */
    private String title;

    /**
     * The path of the documentation file relative to the documentation root.
     */
    private String path;

    /**
     * The content of the documentation file.
     * This field is always base64-encoded when sent to the frontend.
     */
    private String content;

    /**
     * The group ID this documentation file belongs to.
     */
    private String groupId;

    /**
     * The order of this documentation file within its group.
     */
    private int order;

    /**
     * The last modified date of the documentation file.
     */
    private LocalDateTime lastModified;

    /**
     * Whether this documentation file is an overview file for a group.
     */
    private boolean isOverview;

    /**
     * The file extension (e.g., "md").
     */
    private String extension;

    /**
     * Sets the content of the documentation file, encoding it as base64.
     *
     * @param rawContent The raw content to set
     */
    public void setRawContent(String rawContent) {
        if (rawContent != null) {
            this.content = Base64.getEncoder().encodeToString(rawContent.getBytes());
        } else {
            this.content = null;
        }
    }

    /**
     * Gets the raw (decoded) content of the documentation file.
     *
     * @return The decoded content
     */
    public String getRawContent() {
        if (this.content != null) {
            return new String(Base64.getDecoder().decode(this.content));
        }
        return null;
    }
}
