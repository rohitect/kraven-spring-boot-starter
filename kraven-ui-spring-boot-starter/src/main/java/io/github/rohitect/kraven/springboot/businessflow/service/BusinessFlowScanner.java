package io.github.rohitect.kraven.springboot.businessflow.service;

import io.github.rohitect.kraven.springboot.businessflow.annotation.KravenTag;
import io.github.rohitect.kraven.springboot.businessflow.model.BusinessFlow;
import io.github.rohitect.kraven.springboot.businessflow.model.BusinessFlowTag;
import io.github.rohitect.kraven.springboot.businessflow.model.TaggedMethod;
import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.core.MethodIntrospector;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Scanner for methods annotated with KravenTag.
 * This scanner identifies methods that are part of business flows and organizes them
 * based on their tags and stereotypes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BusinessFlowScanner implements ApplicationListener<ApplicationReadyEvent> {

    private final ApplicationContext applicationContext;
    private final KravenUiEnhancedProperties properties;
    
    // Map of tag name to list of tagged methods
    private final Map<String, List<TaggedMethod>> taggedMethodsMap = new ConcurrentHashMap<>();
    
    // Map of stereotype annotations to their string representation
    private static final Map<Class<? extends Annotation>, String> STEREOTYPE_MAP = Map.of(
        Controller.class, "Controller",
        RestController.class, "Controller",
        Service.class, "Service",
        Repository.class, "Repository",
        Component.class, "Component"
    );

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (properties.getBusinessFlow().isEnabled()) {
            log.info("Scanning for KravenTag annotations...");
            scanTaggedMethods();
        }
    }

    /**
     * Scans for methods annotated with KravenTag.
     */
    public void scanTaggedMethods() {
        taggedMethodsMap.clear();
        
        // Get all beans from the application context
        String[] beanNames = applicationContext.getBeanNamesForType(Object.class);
        log.debug("Found {} beans in application context", beanNames.length);
        
        for (String beanName : beanNames) {
            Object bean;
            try {
                bean = applicationContext.getBean(beanName);
            } catch (Exception e) {
                log.warn("Could not get bean '{}': {}", beanName, e.getMessage());
                continue;
            }
            
            Class<?> targetClass = AopProxyUtils.ultimateTargetClass(bean);
            
            // Check for KravenTag annotations on methods
            Map<Method, KravenTag> annotatedMethods = MethodIntrospector.selectMethods(
                targetClass,
                (MethodIntrospector.MetadataLookup<KravenTag>) method ->
                    AnnotatedElementUtils.findMergedAnnotation(method, KravenTag.class)
            );
            
            // Process each annotated method
            for (Map.Entry<Method, KravenTag> entry : annotatedMethods.entrySet()) {
                Method method = entry.getKey();
                KravenTag kravenTag = entry.getValue();
                
                // Create a TaggedMethod model
                TaggedMethod taggedMethod = new TaggedMethod();
                taggedMethod.setClassName(targetClass.getName());
                taggedMethod.setSimpleClassName(targetClass.getSimpleName());
                taggedMethod.setMethodName(method.getName());
                taggedMethod.setTagName(kravenTag.tag());
                taggedMethod.setLevel(kravenTag.level());
                taggedMethod.setDescription(kravenTag.description());
                taggedMethod.setStereotype(determineStereotype(targetClass));
                taggedMethod.setMethodSignature(formatMethodSignature(method));
                taggedMethod.setPackageName(targetClass.getPackage().getName());
                
                // If level is not specified (0), set it based on stereotype
                if (taggedMethod.getLevel() == 0) {
                    taggedMethod.setLevel(getDefaultLevelForStereotype(taggedMethod.getStereotype()));
                }
                
                // Add to the map
                taggedMethodsMap.computeIfAbsent(kravenTag.tag(), k -> new ArrayList<>()).add(taggedMethod);
                
                log.debug("Found KravenTag method: {}.{} with tag: {}", 
                    taggedMethod.getClassName(), taggedMethod.getMethodName(), taggedMethod.getTagName());
            }
        }
        
        log.info("Found {} unique business flow tags", taggedMethodsMap.size());
        taggedMethodsMap.forEach((tag, methods) -> 
            log.info("Tag '{}' has {} methods", tag, methods.size()));
    }
    
    /**
     * Determines the stereotype of a class.
     * 
     * @param clazz the class to check
     * @return the stereotype as a string
     */
    private String determineStereotype(Class<?> clazz) {
        for (Map.Entry<Class<? extends Annotation>, String> entry : STEREOTYPE_MAP.entrySet()) {
            if (clazz.isAnnotationPresent(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "Other";
    }
    
    /**
     * Gets the default level for a stereotype.
     * 
     * @param stereotype the stereotype
     * @return the default level
     */
    private int getDefaultLevelForStereotype(String stereotype) {
        return switch (stereotype) {
            case "Controller" -> 1;
            case "Service" -> 2;
            case "Component" -> 3;
            case "Repository" -> 4;
            default -> 5;
        };
    }
    
    /**
     * Formats a method signature.
     * 
     * @param method the method
     * @return the formatted signature
     */
    private String formatMethodSignature(Method method) {
        StringBuilder sb = new StringBuilder();
        sb.append(method.getName()).append("(");
        
        Class<?>[] paramTypes = method.getParameterTypes();
        for (int i = 0; i < paramTypes.length; i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append(paramTypes[i].getSimpleName());
        }
        
        sb.append(")");
        return sb.toString();
    }
    
    /**
     * Gets all available business flow tags.
     * 
     * @return the list of business flow tags
     */
    public List<BusinessFlowTag> getAllTags() {
        return taggedMethodsMap.entrySet().stream()
            .map(entry -> {
                BusinessFlowTag tag = new BusinessFlowTag();
                tag.setName(entry.getKey());
                tag.setMethodCount(entry.getValue().size());
                tag.setStereotypeCount((int) entry.getValue().stream()
                    .map(TaggedMethod::getStereotype)
                    .distinct()
                    .count());
                return tag;
            })
            .sorted(Comparator.comparing(BusinessFlowTag::getName))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets a business flow by tag name.
     * 
     * @param tagName the tag name
     * @return the business flow
     */
    public BusinessFlow getBusinessFlow(String tagName) {
        List<TaggedMethod> methods = taggedMethodsMap.getOrDefault(tagName, Collections.emptyList());
        
        BusinessFlow flow = new BusinessFlow();
        flow.setTagName(tagName);
        flow.setMethods(methods.stream()
            .sorted(Comparator.comparing(TaggedMethod::getLevel))
            .collect(Collectors.toList()));
        
        // Group methods by stereotype
        Map<String, List<TaggedMethod>> methodsByStereotype = methods.stream()
            .collect(Collectors.groupingBy(TaggedMethod::getStereotype));
        flow.setMethodsByStereotype(methodsByStereotype);
        
        return flow;
    }
    
    /**
     * Refreshes the business flow data by rescanning the application.
     */
    public void refresh() {
        log.info("Refreshing business flow data...");
        scanTaggedMethods();
    }
}
