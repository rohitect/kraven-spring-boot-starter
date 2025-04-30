package io.github.rohitect.kraven.springboot.kafka.service;

import io.github.rohitect.kraven.springboot.kafka.model.KafkaListener;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.MethodIntrospector;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Scanner for Kafka listeners in the application.
 * Implements ApplicationListener to scan for Kafka listeners after the application is fully started.
 * Conditionally enabled only when Kafka is on the classpath and OpenTelemetry tracing is not.
 */
@Component
@ConditionalOnClass(name = "org.springframework.kafka.annotation.KafkaListener")
// @ConditionalOnMissingClass({"io.micrometer.tracing.otel.bridge.OtelSpanCustomizer"})
@RequiredArgsConstructor
public class KafkaListenerScanner implements ApplicationListener<ContextRefreshedEvent> {

    private final ApplicationContext applicationContext;
    private final List<KafkaListener> kafkaListeners = new ArrayList<>();
    private final AtomicBoolean scanned = new AtomicBoolean(false);

    // Logger instance
    private static final Logger log = LoggerFactory.getLogger(KafkaListenerScanner.class);

    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        // Only scan once to prevent potential recursion issues
        if (scanned.compareAndSet(false, true)) {
            try {
                scanKafkaListeners();
            } catch (Exception e) {
                log.error("Error scanning for Kafka listeners: {}", e.getMessage(), e);
                // Ensure we have an empty list even if scanning fails
                kafkaListeners.clear();
            }
        }
    }

    /**
     * Scans for Kafka listeners in the application.
     * This method is designed to be robust against potential issues that could cause infinite recursion.
     */
    private void scanKafkaListeners() {
        log.info("Scanning for Kafka listeners...");
        kafkaListeners.clear();

        try {
            // Get all beans from the application context
            String[] beanNames = applicationContext.getBeanNamesForType(Object.class);
            log.debug("Found {} beans to scan for Kafka listeners", beanNames.length);

            for (String beanName : beanNames) {
                // Skip beans that might cause issues
                if (beanName.contains("tracing") || beanName.contains("opentelemetry") ||
                    beanName.contains("micrometer") || beanName.contains("actuator")) {
                    log.debug("Skipping potentially problematic bean: {}", beanName);
                    continue;
                }

                Object bean;
                try {
                    bean = applicationContext.getBean(beanName);
                } catch (Exception e) {
                    log.debug("Could not get bean '{}': {}", beanName, e.getMessage());
                    continue;
                }

                // Skip null beans
                if (bean == null) {
                    log.debug("Bean '{}' is null", beanName);
                    continue;
                }

                Class<?> targetClass;
                try {
                    targetClass = AopProxyUtils.ultimateTargetClass(bean);
                } catch (Exception e) {
                    log.debug("Could not get target class for bean '{}': {}", beanName, e.getMessage());
                    continue;
                }

                // Skip classes that might cause issues
                String className = targetClass.getName();
                if (className.contains("tracing") || className.contains("opentelemetry") ||
                    className.contains("micrometer") || className.contains("actuator")) {
                    log.debug("Skipping potentially problematic class: {}", className);
                    continue;
                }

                try {
                    // Check for @KafkaListener annotations on methods
                    Map<Method, org.springframework.kafka.annotation.KafkaListener> annotatedMethods = MethodIntrospector.selectMethods(
                            targetClass,
                            (MethodIntrospector.MetadataLookup<org.springframework.kafka.annotation.KafkaListener>) method ->
                                    AnnotatedElementUtils.findMergedAnnotation(method, org.springframework.kafka.annotation.KafkaListener.class)
                    );

                    // Process each annotated method
                    for (Map.Entry<Method, org.springframework.kafka.annotation.KafkaListener> entry : annotatedMethods.entrySet()) {
                        try {
                            Method method = entry.getKey();
                            org.springframework.kafka.annotation.KafkaListener kafkaListenerAnnotation = entry.getValue();

                            // Create a KafkaListener model
                            KafkaListener listener = new KafkaListener();
                            listener.setId(kafkaListenerAnnotation.id().isEmpty() ? method.getName() : kafkaListenerAnnotation.id());
                            listener.setTopics(Arrays.asList(kafkaListenerAnnotation.topics()));
                            listener.setGroupId(kafkaListenerAnnotation.groupId());
                            listener.setClassName(targetClass.getName());
                            listener.setMethodName(method.getName());
                            listener.setBeanName(beanName);
                            listener.setMessageType(method.getParameterTypes().length > 0 ? method.getParameterTypes()[0].getName() : "unknown");

                            kafkaListeners.add(listener);
                            log.debug("Found Kafka listener: {}", listener);
                        } catch (Exception e) {
                            log.warn("Error processing Kafka listener method: {}", e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    log.warn("Error scanning for Kafka listeners in class {}: {}", targetClass.getName(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Error during Kafka listener scanning: {}", e.getMessage(), e);
        }

        log.info("Found {} Kafka listeners", kafkaListeners.size());
    }

    /**
     * Gets all Kafka listeners found in the application.
     * Returns a defensive copy to prevent modification of the internal list.
     *
     * @return List of Kafka listeners
     */
    public List<KafkaListener> getKafkaListeners() {
        // If we haven't scanned yet, do it now
        if (scanned.compareAndSet(false, true)) {
            try {
                scanKafkaListeners();
            } catch (Exception e) {
                log.error("Error scanning for Kafka listeners: {}", e.getMessage(), e);
                // Ensure we have an empty list even if scanning fails
                kafkaListeners.clear();
            }
        }

        // Return a defensive copy
        return new ArrayList<>(kafkaListeners);
    }
}
