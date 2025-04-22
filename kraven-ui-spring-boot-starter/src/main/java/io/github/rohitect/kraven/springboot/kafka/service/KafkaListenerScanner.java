package io.github.rohitect.kraven.springboot.kafka.service;

import io.github.rohitect.kraven.springboot.kafka.model.KafkaListener;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
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

/**
 * Scanner for Kafka listeners in the application.
 * Implements ApplicationListener to scan for Kafka listeners after the application is fully started.
 */
@Component
@ConditionalOnClass(name = "org.springframework.kafka.annotation.KafkaListener")
@RequiredArgsConstructor
public class KafkaListenerScanner implements ApplicationListener<ContextRefreshedEvent> {

    private final ApplicationContext applicationContext;
    private final List<KafkaListener> kafkaListeners = new ArrayList<>();

    // Logger instance
    private static final Logger log = LoggerFactory.getLogger(KafkaListenerScanner.class);

    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        scanKafkaListeners();
    }

    /**
     * Scans for Kafka listeners in the application.
     */
    private void scanKafkaListeners() {
        log.info("Scanning for Kafka listeners...");
        kafkaListeners.clear();

        // Get all beans from the application context
        String[] beanNames = applicationContext.getBeanNamesForType(Object.class);
        for (String beanName : beanNames) {
            Object bean = applicationContext.getBean(beanName);
            Class<?> targetClass = AopProxyUtils.ultimateTargetClass(bean);

            // Check for @KafkaListener annotations on methods
            Map<Method, org.springframework.kafka.annotation.KafkaListener> annotatedMethods = MethodIntrospector.selectMethods(
                    targetClass,
                    (MethodIntrospector.MetadataLookup<org.springframework.kafka.annotation.KafkaListener>) method ->
                            AnnotatedElementUtils.findMergedAnnotation(method, org.springframework.kafka.annotation.KafkaListener.class)
            );

            // Process each annotated method
            for (Map.Entry<Method, org.springframework.kafka.annotation.KafkaListener> entry : annotatedMethods.entrySet()) {
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
                log.info("Found Kafka listener: {}", listener);
            }
        }

        log.info("Found {} Kafka listeners", kafkaListeners.size());
    }

    /**
     * Gets all Kafka listeners found in the application.
     *
     * @return List of Kafka listeners
     */
    public List<KafkaListener> getKafkaListeners() {
        return kafkaListeners;
    }
}
