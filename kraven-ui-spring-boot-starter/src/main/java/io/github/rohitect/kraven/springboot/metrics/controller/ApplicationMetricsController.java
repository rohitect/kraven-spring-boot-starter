package io.github.rohitect.kraven.springboot.metrics.controller;

import io.github.rohitect.kraven.springboot.metrics.model.ApplicationMetrics;
import io.github.rohitect.kraven.springboot.metrics.service.ApplicationMetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * REST controller for application metrics.
 */
@RestController
@RequestMapping("/api/kraven-metrics")
@Tag(name = "Kraven Application Metrics", description = "APIs for retrieving application metrics")
@RequiredArgsConstructor
@Slf4j
@EnableCaching
@ConditionalOnBean(ApplicationMetricsService.class)
public class ApplicationMetricsController {

    private final ApplicationMetricsService metricsService;

    @GetMapping
    @Operation(summary = "Get application metrics", description = "Retrieves metrics about the application, JVM, Spring, Kafka, and Feign clients")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved metrics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics> getMetrics() {
        log.debug("Getting application metrics");
        return ResponseEntity.ok(metricsService.getApplicationMetrics());
    }

    @GetMapping("/jvm")
    @Operation(summary = "Get JVM metrics", description = "Retrieves metrics about the JVM")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved JVM metrics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.JvmMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics.JvmMetrics> getJvmMetrics() {
        log.debug("Getting JVM metrics");
        return ResponseEntity.ok(metricsService.getJvmMetrics());
    }

    @GetMapping("/application")
    @Operation(summary = "Get application info", description = "Retrieves information about the application")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved application info",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.AppMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics.AppMetrics> getAppMetrics() {
        log.debug("Getting application info");
        return ResponseEntity.ok(metricsService.getAppMetrics());
    }

    @GetMapping("/spring")
    @Operation(summary = "Get Spring metrics", description = "Retrieves metrics about Spring beans and components")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved Spring metrics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.SpringMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics.SpringMetrics> getSpringMetrics() {
        log.debug("Getting Spring metrics");
        return ResponseEntity.ok(metricsService.getSpringMetrics());
    }

    @GetMapping("/kafka")
    @Operation(summary = "Get Kafka metrics", description = "Retrieves metrics about Kafka topics, consumers, and listeners")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved Kafka metrics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.KafkaMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics.KafkaMetrics> getKafkaMetrics() {
        log.debug("Getting Kafka metrics");
        return ResponseEntity.ok(metricsService.getKafkaMetrics());
    }

    @GetMapping("/feign")
    @Operation(summary = "Get Feign client metrics", description = "Retrieves metrics about Feign clients")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved Feign client metrics",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApplicationMetrics.FeignMetrics.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<ApplicationMetrics.FeignMetrics> getFeignMetrics() {
        log.debug("Getting Feign client metrics");
        return ResponseEntity.ok(metricsService.getFeignMetrics());
    }

    @GetMapping("/thread-dump")
    @Operation(summary = "Generate thread dump", description = "Generates a thread dump of the JVM")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully generated thread dump",
                    content = @Content(mediaType = "text/plain")),
            @ApiResponse(responseCode = "500", description = "Internal server error", content = @Content)
    })
    public ResponseEntity<byte[]> generateThreadDump() {
        log.debug("Generating thread dump");
        String threadDump = metricsService.generateThreadDump();

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMdd-HHmmss");
        String timestamp = dateFormat.format(new Date());
        String filename = "thread-dump-" + timestamp + ".txt";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", filename);

        return ResponseEntity.ok()
                .headers(headers)
                .body(threadDump.getBytes(StandardCharsets.UTF_8));
    }
}
