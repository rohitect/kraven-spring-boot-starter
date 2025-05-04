package io.github.rohitect.kraven.plugins.mockserver.controller;

import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.event.MockServerEvent;
import io.github.rohitect.kraven.plugins.mockserver.event.MockServerEventType;
import io.github.rohitect.kraven.plugins.mockserver.service.MockServerService;
import io.github.rohitect.kraven.plugins.mockserver.service.TemplateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for advanced Mock Server plugin API features.
 */
@RestController
@RequestMapping("/kraven/plugin/mock-server/api")
@Slf4j
public class MockServerApiController {

    @Autowired
    private MockServerConfig config;

    @Autowired
    private MockServerService mockServerService;
    
    @Autowired
    private TemplateService templateService;
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;

    /**
     * Get the list of available template engines.
     */
    @GetMapping("/template-engines")
    public ResponseEntity<List<String>> getTemplateEngines() {
        return ResponseEntity.ok(templateService.getAvailableEngines());
    }

    /**
     * Test a template with sample data.
     */
    @PostMapping("/test-template")
    public ResponseEntity<Map<String, Object>> testTemplate(
            @RequestParam String engine,
            @RequestParam String template,
            @RequestBody(required = false) Map<String, Object> context) {
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            if (context == null) {
                context = new HashMap<>();
            }
            
            String rendered = templateService.renderTemplate(engine, template, context);
            result.put("success", true);
            result.put("rendered", rendered);
            
            // Publish template test event
            eventPublisher.publishEvent(new MockServerEvent(this, MockServerEventType.TEMPLATE_TESTED, 
                    Map.of("engine", engine, "template", template)));
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to test template", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.ok(result);
        }
    }

    /**
     * Extract variables from a path pattern.
     */
    @GetMapping("/extract-path-variables")
    public ResponseEntity<Map<String, Object>> extractPathVariables(
            @RequestParam String pattern,
            @RequestParam String path) {
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            Map<String, String> variables = mockServerService.extractPathVariables(pattern, path);
            result.put("success", true);
            result.put("variables", variables);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to extract path variables", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.ok(result);
        }
    }

    /**
     * Get the list of available matchers.
     */
    @GetMapping("/matchers")
    public ResponseEntity<Map<String, Object>> getMatchers() {
        Map<String, Object> result = new HashMap<>();
        
        result.put("types", List.of("header", "query-param", "path-variable", "body"));
        result.put("operators", List.of("equals", "contains", "startsWith", "endsWith", "regex", "exists"));
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get the plugin extension capabilities.
     */
    @GetMapping("/capabilities")
    public ResponseEntity<Map<String, Object>> getCapabilities() {
        Map<String, Object> capabilities = new HashMap<>();
        
        capabilities.put("templateEngines", templateService.getAvailableEngines());
        capabilities.put("matcherTypes", List.of("header", "query-param", "path-variable", "body"));
        capabilities.put("responseTypes", List.of("manual", "sequence", "conditional"));
        capabilities.put("version", "1.0.0");
        
        return ResponseEntity.ok(capabilities);
    }
}
