package io.github.rohitect.kraven.springboot.businessflow.controller;

import io.github.rohitect.kraven.springboot.businessflow.model.BusinessFlow;
import io.github.rohitect.kraven.springboot.businessflow.model.BusinessFlowTag;
import io.github.rohitect.kraven.springboot.businessflow.service.BusinessFlowScanner;
import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for business flow operations.
 */
@RestController
@RequestMapping("${kraven.ui.path:/kraven}/v1/business-flows")
@RequiredArgsConstructor
@Slf4j
public class BusinessFlowController {

    private final BusinessFlowScanner businessFlowScanner;
    private final KravenUiEnhancedProperties properties;

    /**
     * Gets all available business flow tags.
     *
     * @return the list of business flow tags
     */
    @GetMapping("/tags")
    public ResponseEntity<List<BusinessFlowTag>> getAllTags() {
        if (!properties.getBusinessFlow().isEnabled()) {
            log.warn("Business flow feature is disabled");
            return ResponseEntity.ok(List.of());
        }

        log.debug("Getting all business flow tags");
        List<BusinessFlowTag> tags = businessFlowScanner.getAllTags();
        return ResponseEntity.ok(tags);
    }

    /**
     * Gets a business flow by tag name.
     *
     * @param tagName the tag name
     * @return the business flow
     */
    @GetMapping("/flows/{tagName}")
    public ResponseEntity<BusinessFlow> getBusinessFlow(@PathVariable(name = "tagName") String tagName) {
        if (!properties.getBusinessFlow().isEnabled()) {
            log.warn("Business flow feature is disabled");
            return ResponseEntity.ok(new BusinessFlow());
        }

        log.debug("Getting business flow for tag: {}", tagName);
        BusinessFlow flow = businessFlowScanner.getBusinessFlow(tagName);
        return ResponseEntity.ok(flow);
    }

    /**
     * Refreshes the business flow data by rescanning the application.
     *
     * @return a success message
     */
    @PostMapping("/refresh")
    public ResponseEntity<String> refreshBusinessFlows() {
        if (!properties.getBusinessFlow().isEnabled()) {
            log.warn("Business flow feature is disabled");
            return ResponseEntity.ok("Business flow feature is disabled");
        }

        log.info("Refreshing business flows");
        businessFlowScanner.refresh();
        return ResponseEntity.ok("Business flows refreshed successfully");
    }
}
