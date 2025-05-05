package io.github.rohitect.kraven.plugins.actuatorinsights.controller;

import io.github.rohitect.kraven.plugins.actuatorinsights.model.ActuatorData;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.ActuatorEndpoint;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.HealthStatus;
import io.github.rohitect.kraven.plugins.actuatorinsights.model.MetricData;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDataCollectionService;
import io.github.rohitect.kraven.plugins.actuatorinsights.service.ActuatorDetectionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for the Actuator Insights plugin.
 */
@RestController
@RequestMapping("/kraven/api/plugins/actuator-insights")
@Slf4j
public class ActuatorInsightsController {

    private final ActuatorDetectionService detectionService;
    private final ActuatorDataCollectionService dataCollectionService;

    public ActuatorInsightsController(
            ActuatorDetectionService detectionService,
            ActuatorDataCollectionService dataCollectionService) {
        this.detectionService = detectionService;
        this.dataCollectionService = dataCollectionService;
    }

    /**
     * Get the status of the plugin.
     *
     * @return the plugin status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("actuatorDetected", detectionService.isActuatorDetected());

        // Add context path and actuator base path information
        String contextPath = dataCollectionService.getContextPath();
        String actuatorBasePath = dataCollectionService.getActuatorBasePath();

        status.put("contextPath", contextPath);
        status.put("actuatorBasePath", actuatorBasePath);

        // Construct the full actuator URL for the frontend
        String fullActuatorPath = "";
        if (contextPath != null && !contextPath.isEmpty()) {
            if (!contextPath.startsWith("/")) {
                fullActuatorPath += "/";
            }
            fullActuatorPath += contextPath;
            if (!contextPath.endsWith("/")) {
                fullActuatorPath += "/";
            }
        } else {
            fullActuatorPath += "/";
        }

        if (actuatorBasePath != null && !actuatorBasePath.isEmpty()) {
            if (actuatorBasePath.startsWith("/")) {
                actuatorBasePath = actuatorBasePath.substring(1);
            }
            fullActuatorPath += actuatorBasePath;
        } else {
            fullActuatorPath += "actuator";
        }

        status.put("fullActuatorPath", fullActuatorPath);

        return ResponseEntity.ok(status);
    }

    /**
     * Get the available actuator endpoints.
     *
     * @return the list of available endpoints
     */
    @GetMapping("/endpoints")
    public ResponseEntity<List<ActuatorEndpoint>> getEndpoints() {
        return ResponseEntity.ok(dataCollectionService.getAvailableEndpoints());
    }

    /**
     * Get the latest health data.
     *
     * @return the latest health data
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealthData() {
        return ResponseEntity.ok(dataCollectionService.getHealthData());
    }

    /**
     * Get the latest metrics data.
     *
     * @return the latest metrics data
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, MetricData>> getMetricsData() {
        return ResponseEntity.ok(dataCollectionService.getMetricsData());
    }

    /**
     * Get the latest environment data.
     *
     * @return the latest environment data
     */
    @GetMapping("/environment")
    public ResponseEntity<Map<String, Object>> getEnvironmentData() {
        return ResponseEntity.ok(dataCollectionService.getEnvData());
    }

    /**
     * Get the latest info data.
     *
     * @return the latest info data
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfoData() {
        return ResponseEntity.ok(dataCollectionService.getInfoData());
    }

    /**
     * Get the latest beans data.
     *
     * @return the latest beans data
     */
    @GetMapping("/beans")
    public ResponseEntity<Map<String, Object>> getBeansData() {
        return ResponseEntity.ok(dataCollectionService.getBeansData());
    }

    /**
     * Get all actuator data (for backward compatibility).
     *
     * @return the latest actuator data
     */
    @GetMapping("/data")
    public ResponseEntity<ActuatorData> getData() {
        return ResponseEntity.ok(dataCollectionService.getActuatorData());
    }

    // History endpoints removed as history is now maintained only in the frontend

    /**
     * Force a refresh of the actuator data.
     *
     * @return a success message
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshData() {
        Map<String, Object> response = new HashMap<>();

        // Stop and restart data collection to force a refresh
        dataCollectionService.stopDataCollection();
        dataCollectionService.startDataCollection();

        response.put("success", true);
        response.put("message", "Actuator data refreshed successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Manually set the actuator detection status.
     *
     * @param detected the detection status to set
     * @return a success message
     */
    @PostMapping("/detection")
    public ResponseEntity<Map<String, Object>> setDetectionStatus(@RequestParam boolean detected) {
        Map<String, Object> response = new HashMap<>();

        detectionService.setActuatorDetected(detected);

        if (detected) {
            dataCollectionService.startDataCollection();
            response.put("message", "Actuator detection status set to detected, data collection started");
        } else {
            dataCollectionService.stopDataCollection();
            response.put("message", "Actuator detection status set to not detected, data collection stopped");
        }

        response.put("success", true);

        return ResponseEntity.ok(response);
    }
}
