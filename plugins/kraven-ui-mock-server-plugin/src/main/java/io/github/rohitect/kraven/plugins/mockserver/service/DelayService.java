package io.github.rohitect.kraven.plugins.mockserver.service;

import io.github.rohitect.kraven.plugins.mockserver.config.MockServerConfig;
import io.github.rohitect.kraven.plugins.mockserver.model.MockDelayCondition;
import io.github.rohitect.kraven.plugins.mockserver.model.MockEndpoint;
import io.github.rohitect.kraven.plugins.mockserver.model.MockResponse;
import io.undertow.server.HttpServerExchange;
import io.undertow.util.HeaderMap;
import io.undertow.util.HeaderValues;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

/**
 * Service for handling response delays.
 */
@Service
@Slf4j
public class DelayService {

    @Autowired
    private MockServerConfig config;
    
    @Autowired
    private MockServerService mockServerService;
    
    private final Random random = new Random();
    
    /**
     * Calculate the delay for a response.
     *
     * @param response the response configuration
     * @param exchange the HTTP server exchange
     * @param endpoint the endpoint configuration
     * @return the delay in milliseconds
     */
    public int calculateDelay(MockResponse response, HttpServerExchange exchange, MockEndpoint endpoint) {
        // Check if delay conditions are met
        if (response.getDelayConditions() != null && !response.getDelayConditions().isEmpty()) {
            if (!checkDelayConditions(response.getDelayConditions(), exchange, endpoint)) {
                log.debug("Delay conditions not met, using default delay");
                return config.getDefaultDelayMs();
            }
        }
        
        // Use random delay range if configured
        if (response.isDelayRange()) {
            if (response.getMinDelay() >= 0 && response.getMaxDelay() > response.getMinDelay()) {
                int randomDelay = ThreadLocalRandom.current().nextInt(
                        response.getMinDelay(), response.getMaxDelay() + 1);
                log.debug("Using random delay: {}ms (range: {}-{}ms)", 
                        randomDelay, response.getMinDelay(), response.getMaxDelay());
                return randomDelay;
            } else {
                log.warn("Invalid delay range: min={}, max={}", response.getMinDelay(), response.getMaxDelay());
            }
        }
        
        // Use fixed delay if configured
        if (response.getDelay() > 0) {
            log.debug("Using fixed delay: {}ms", response.getDelay());
            return response.getDelay();
        }
        
        // Fall back to default delay
        log.debug("Using default delay: {}ms", config.getDefaultDelayMs());
        return config.getDefaultDelayMs();
    }
    
    /**
     * Check if the delay conditions are met.
     *
     * @param conditions the delay conditions
     * @param exchange the HTTP server exchange
     * @param endpoint the endpoint configuration
     * @return true if the conditions are met, false otherwise
     */
    private boolean checkDelayConditions(List<MockDelayCondition> conditions, HttpServerExchange exchange, MockEndpoint endpoint) {
        for (MockDelayCondition condition : conditions) {
            boolean matches = false;
            
            switch (condition.getType()) {
                case "header":
                    matches = matchesHeader(exchange, condition);
                    break;
                case "query-param":
                    matches = matchesQueryParam(exchange, condition);
                    break;
                case "path-variable":
                    matches = matchesPathVariable(exchange, endpoint.getPath(), condition);
                    break;
                case "method":
                    matches = matchesMethod(exchange, condition);
                    break;
                case "path":
                    matches = matchesPath(exchange, condition);
                    break;
                default:
                    log.warn("Unknown condition type: {}", condition.getType());
                    matches = false;
            }
            
            // If a required condition doesn't match, the conditions are not met
            if (condition.isRequired() && !matches) {
                return false;
            }
        }
        
        // All conditions passed
        return true;
    }
    
    /**
     * Check if a request header matches a condition.
     *
     * @param exchange the HTTP server exchange
     * @param condition the condition to check
     * @return true if the header matches, false otherwise
     */
    private boolean matchesHeader(HttpServerExchange exchange, MockDelayCondition condition) {
        HeaderMap headers = exchange.getRequestHeaders();
        HeaderValues headerValues = headers.get(condition.getName());
        
        if (headerValues == null || headerValues.isEmpty()) {
            return "exists".equals(condition.getOperator()) && !condition.isRequired();
        }
        
        // Use the first header value
        String headerValue = headerValues.getFirst();
        return matchesValue(headerValue, condition);
    }
    
    /**
     * Check if a query parameter matches a condition.
     *
     * @param exchange the HTTP server exchange
     * @param condition the condition to check
     * @return true if the query parameter matches, false otherwise
     */
    private boolean matchesQueryParam(HttpServerExchange exchange, MockDelayCondition condition) {
        Map<String, Deque<String>> queryParameters = exchange.getQueryParameters();
        Deque<String> values = queryParameters.get(condition.getName());
        
        if (values == null || values.isEmpty()) {
            return "exists".equals(condition.getOperator()) && !condition.isRequired();
        }
        
        // Use the first query parameter value
        String value = values.getFirst();
        return matchesValue(value, condition);
    }
    
    /**
     * Check if a path variable matches a condition.
     *
     * @param exchange the HTTP server exchange
     * @param templatePath the path with potential ${} variables
     * @param condition the condition to check
     * @return true if the path variable matches, false otherwise
     */
    private boolean matchesPathVariable(HttpServerExchange exchange, String templatePath, MockDelayCondition condition) {
        String actualPath = exchange.getRequestPath();
        Map<String, String> variables = mockServerService.extractPathVariables(templatePath, actualPath);
        
        String value = variables.get(condition.getName());
        if (value == null) {
            return "exists".equals(condition.getOperator()) && !condition.isRequired();
        }
        
        return matchesValue(value, condition);
    }
    
    /**
     * Check if the request method matches a condition.
     *
     * @param exchange the HTTP server exchange
     * @param condition the condition to check
     * @return true if the method matches, false otherwise
     */
    private boolean matchesMethod(HttpServerExchange exchange, MockDelayCondition condition) {
        String method = exchange.getRequestMethod().toString();
        return matchesValue(method, condition);
    }
    
    /**
     * Check if the request path matches a condition.
     *
     * @param exchange the HTTP server exchange
     * @param condition the condition to check
     * @return true if the path matches, false otherwise
     */
    private boolean matchesPath(HttpServerExchange exchange, MockDelayCondition condition) {
        String path = exchange.getRequestPath();
        return matchesValue(path, condition);
    }
    
    /**
     * Check if a value matches a condition.
     *
     * @param valueToMatch the value to check
     * @param condition the condition to check
     * @return true if the value matches, false otherwise
     */
    private boolean matchesValue(String valueToMatch, MockDelayCondition condition) {
        if (valueToMatch == null) {
            // If the value to match is null, it only matches if we're checking for existence
            return "exists".equals(condition.getOperator()) && !condition.isRequired();
        }
        
        String matchValue = condition.getValue();
        String matchPattern = condition.getPattern();
        
        // If case-insensitive, convert both to lowercase
        if (!condition.isCaseSensitive()) {
            valueToMatch = valueToMatch.toLowerCase();
            if (matchValue != null) {
                matchValue = matchValue.toLowerCase();
            }
            if (matchPattern != null) {
                matchPattern = matchPattern.toLowerCase();
            }
        }
        
        // Check based on operator
        switch (condition.getOperator()) {
            case "equals":
                return matchValue != null && matchValue.equals(valueToMatch);
            case "contains":
                return matchValue != null && valueToMatch.contains(matchValue);
            case "startsWith":
                return matchValue != null && valueToMatch.startsWith(matchValue);
            case "endsWith":
                return matchValue != null && valueToMatch.endsWith(matchValue);
            case "regex":
                return matchPattern != null && Pattern.compile(matchPattern).matcher(valueToMatch).matches();
            case "exists":
                return true; // If we got here, the value exists
            default:
                return false;
        }
    }
}
