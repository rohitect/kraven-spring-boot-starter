package io.github.rohitect.kraven.springboot.documentation.controller;

import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import io.github.rohitect.kraven.springboot.documentation.model.BusinessFlowTag;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationConfig;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationFile;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationGroup;
import io.github.rohitect.kraven.springboot.documentation.service.BusinessFlowTagParser;
import io.github.rohitect.kraven.springboot.documentation.service.DocumentationScanner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for documentation operations.
 */
@RestController
@RequestMapping("/kraven/api/documentation")
@RequiredArgsConstructor
@Slf4j
public class DocumentationController {

    private final DocumentationScanner documentationScanner;
    private final BusinessFlowTagParser businessFlowTagParser;
    private final KravenUiEnhancedProperties properties;

    /**
     * Gets the documentation configuration.
     */
    @GetMapping("/config")
    public ResponseEntity<DocumentationConfig> getConfig() {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(new DocumentationConfig());
        }

        log.debug("Getting documentation configuration");
        DocumentationConfig config = documentationScanner.getDocumentationConfig();
        return ResponseEntity.ok(config);
    }

    /**
     * Gets all documentation groups.
     */
    @GetMapping("/groups")
    public ResponseEntity<List<DocumentationGroup>> getAllGroups() {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(List.of());
        }

        log.debug("Getting all documentation groups");
        List<DocumentationGroup> groups = documentationScanner.getAllGroups();
        return ResponseEntity.ok(groups);
    }

    /**
     * Gets a documentation group by ID.
     */
    @GetMapping("/groups/{groupId}")
    public ResponseEntity<DocumentationGroup> getGroup(@PathVariable(name = "groupId") String groupId) {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(new DocumentationGroup());
        }

        log.debug("Getting documentation group: {}", groupId);
        DocumentationGroup group = documentationScanner.getGroup(groupId);
        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(group);
    }

    /**
     * Gets a documentation file by ID.
     */
    @GetMapping("/files/{fileId}")
    public ResponseEntity<DocumentationFile> getFile(@PathVariable(name = "fileId") String fileId) {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(new DocumentationFile());
        }

        log.debug("Getting documentation file: {}", fileId);
        DocumentationFile file = documentationScanner.getFile(fileId);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(file);
    }

    /**
     * Gets all business flow tags for a documentation file.
     */
    @GetMapping("/files/{fileId}/business-flow-tags")
    public ResponseEntity<List<BusinessFlowTag>> getBusinessFlowTags(@PathVariable(name = "fileId") String fileId) {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(List.of());
        }

        log.debug("Getting business flow tags for file: {}", fileId);
        List<BusinessFlowTag> tags = businessFlowTagParser.getBusinessFlowTags(fileId);
        return ResponseEntity.ok(tags);
    }

    /**
     * Gets a business flow tag by name and documentation file ID.
     */
    @GetMapping("/files/{fileId}/business-flow-tags/{tagName}")
    public ResponseEntity<BusinessFlowTag> getBusinessFlowTag(
            @PathVariable(name = "fileId") String fileId,
            @PathVariable(name = "tagName") String tagName) {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(new BusinessFlowTag());
        }

        log.debug("Getting business flow tag '{}' for file: {}", tagName, fileId);
        BusinessFlowTag tag = businessFlowTagParser.getBusinessFlowTag(fileId, tagName);
        if (tag == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(tag);
    }

    /**
     * Gets all business flow tags.
     */
    @GetMapping("/business-flow-tags")
    public ResponseEntity<Map<String, List<BusinessFlowTag>>> getAllBusinessFlowTags() {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok(Map.of());
        }

        log.debug("Getting all business flow tags");
        Map<String, List<BusinessFlowTag>> tags = businessFlowTagParser.getAllBusinessFlowTags();
        return ResponseEntity.ok(tags);
    }

    /**
     * Refreshes the documentation by rescanning.
     */
    @PostMapping("/refresh")
    public ResponseEntity<String> refreshDocumentation() {
        if (!properties.getDocumentation().isEnabled()) {
            log.warn("Documentation feature is disabled");
            return ResponseEntity.ok("Documentation feature is disabled");
        }

        log.info("Refreshing documentation");
        documentationScanner.refresh();
        return ResponseEntity.ok("Documentation refreshed successfully");
    }
}
