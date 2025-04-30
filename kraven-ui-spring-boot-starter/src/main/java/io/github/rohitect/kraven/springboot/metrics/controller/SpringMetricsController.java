package io.github.rohitect.kraven.springboot.metrics.controller;

import io.github.rohitect.kraven.springboot.metrics.model.*;
import io.github.rohitect.kraven.springboot.metrics.service.SpringMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for Spring metrics.
 */
@Slf4j
@RestController
@RequestMapping("/kraven/api/metrics")
@RequiredArgsConstructor
public class SpringMetricsController {

    private final SpringMetricsService springMetricsService;

    /**
     * Get details about all Spring beans.
     *
     * @return List of bean details
     */
    @GetMapping("/beans")
    public List<SpringBeanDetails> getBeanDetails() {
        log.debug("REST request to get Spring bean details");
        return springMetricsService.getBeanDetails();
    }

    /**
     * Get details about Spring controllers.
     *
     * @return List of controller details
     */
    @GetMapping("/controllers")
    public List<SpringControllerDetails> getControllerDetails() {
        log.debug("REST request to get Spring controller details");
        return springMetricsService.getControllerDetails();
    }

    /**
     * Get details about Spring services.
     *
     * @return List of service details
     */
    @GetMapping("/services")
    public List<SpringServiceDetails> getServiceDetails() {
        log.debug("REST request to get Spring service details");
        return springMetricsService.getServiceDetails();
    }

    /**
     * Get details about Spring repositories.
     *
     * @return List of repository details
     */
    @GetMapping("/repositories")
    public List<SpringRepositoryDetails> getRepositoryDetails() {
        log.debug("REST request to get Spring repository details");
        return springMetricsService.getRepositoryDetails();
    }

    /**
     * Get details about Spring components.
     *
     * @return List of component details
     */
    @GetMapping("/components")
    public List<SpringComponentDetails> getComponentDetails() {
        log.debug("REST request to get Spring component details");
        return springMetricsService.getComponentDetails();
    }

    /**
     * Get details about Spring configuration classes.
     *
     * @return List of configuration details
     */
    @GetMapping("/configurations")
    public List<SpringConfigurationDetails> getConfigurationDetails() {
        log.debug("REST request to get Spring configuration details");
        return springMetricsService.getConfigurationDetails();
    }
}
