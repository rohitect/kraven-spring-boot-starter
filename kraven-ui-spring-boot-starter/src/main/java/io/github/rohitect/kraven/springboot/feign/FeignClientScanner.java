package io.github.rohitect.kraven.springboot.feign;

import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scanner for Feign clients.
 * Implements ApplicationListener to scan for Feign clients after the application is fully started.
 */
@Component
public class FeignClientScanner implements ApplicationListener<ApplicationReadyEvent> {

    private final ApplicationContext applicationContext;
    private final KravenUiEnhancedProperties properties;
    private List<FeignClientMetadata> feignClients;
    private long lastScanTime = 0;

    @Autowired
    public FeignClientScanner(ApplicationContext applicationContext, KravenUiEnhancedProperties properties) {
        this.applicationContext = applicationContext;
        this.properties = properties;
    }

    /**
     * Handle the ApplicationReadyEvent which is fired when the application is fully started.
     * This ensures that all beans are fully initialized before scanning for Feign clients.
     *
     * @param event the ApplicationReadyEvent
     */
    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (properties.getFeignClient().isEnabled()) {
            String[] basePackages = properties.getFeignClient().getBasePackages();
            System.out.println("Application is ready. Initializing Feign client scanner with base packages: " + String.join(", ", basePackages));
            try {
                // Check if Spring Cloud OpenFeign is available
                Class.forName("org.springframework.cloud.openfeign.FeignClient");
                scanFeignClients(basePackages);
            } catch (ClassNotFoundException e) {
                System.err.println("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
                System.err.println("To use the Feign client scanner, add the spring-cloud-starter-openfeign dependency to your project.");
            }
        } else {
            System.out.println("Feign client scanning is disabled");
        }
    }

    /**
     * Scheduled method to refresh Feign client metadata if scan interval is set.
     * This method will be called at the configured interval to refresh the Feign client metadata.
     */
    @Scheduled(fixedDelayString = "${kraven.ui.feign-client.scan-interval-ms:0}")
    public void refreshFeignClients() {
        // Only refresh if scan interval is greater than 0 and enough time has passed since the last scan
        if (properties.getFeignClient().getScanIntervalMs() > 0 &&
            System.currentTimeMillis() - lastScanTime >= properties.getFeignClient().getScanIntervalMs()) {

            System.out.println("Refreshing Feign client metadata...");
            String[] basePackages = properties.getFeignClient().getBasePackages();
            try {
                // Check if Spring Cloud OpenFeign is available
                Class.forName("org.springframework.cloud.openfeign.FeignClient");

                // Clear the cache and rescan
                feignClients = null;
                scanFeignClients(basePackages);

                System.out.println("Feign client metadata refreshed");
            } catch (ClassNotFoundException e) {
                System.err.println("WARNING: Spring Cloud OpenFeign is not available on the classpath. Feign client scanning is disabled.");
            }
        }
    }

    /**
     * Scans for Feign clients in the specified packages.
     *
     * @param basePackages the base packages to scan
     * @return the list of Feign client metadata
     */
    public List<FeignClientMetadata> scanFeignClients(String... basePackages) {
        // If caching is enabled and feignClients is already initialized, return it
        if (properties.getFeignClient().isCacheMetadata() && feignClients != null && !feignClients.isEmpty()) {
            System.out.println("Returning cached Feign clients: " + feignClients.size());
            return feignClients;
        }

        // If no base packages are provided, use the configured ones
        if (basePackages == null || basePackages.length == 0) {
            basePackages = properties.getFeignClient().getBasePackages();
        }

        feignClients = new ArrayList<>();
        lastScanTime = System.currentTimeMillis();

        try {
            // Try to load the FeignClient annotation class
            Class<?> feignClientClass = Class.forName("org.springframework.cloud.openfeign.FeignClient");
            System.out.println("Successfully loaded FeignClient annotation class");

            // Try both approaches to find Feign clients
            scanUsingClassPathScanner(basePackages, feignClientClass);

            // If no clients found, try scanning using application context
            if (feignClients.isEmpty()) {
                scanUsingApplicationContext(feignClientClass);
            }

            System.out.println("Total Feign clients found: " + feignClients.size());
            if (!feignClients.isEmpty()) {
                System.out.println("Feign client names: " + feignClients.stream()
                    .map(FeignClientMetadata::getName)
                    .collect(Collectors.joining(", ")));
            }
        } catch (ClassNotFoundException e) {
            System.err.println("FeignClient annotation not found. Spring Cloud OpenFeign might not be on the classpath.");
            System.err.println("Exception details: " + e.getMessage());
            e.printStackTrace();
        }

        return feignClients;
    }

    /**
     * Scans for Feign clients using ClassPathScanningCandidateComponentProvider.
     *
     * @param basePackages the base packages to scan
     * @param feignClientClass the FeignClient annotation class
     */
    private void scanUsingClassPathScanner(String[] basePackages, Class<?> feignClientClass) {
        // Create a custom scanner that includes interfaces
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false) {
            @Override
            protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
                // Include interfaces that are annotated with @FeignClient
                return beanDefinition.getMetadata().isInterface() && beanDefinition.getMetadata().hasAnnotation(feignClientClass.getName());
            }
        };
        scanner.addIncludeFilter(new AnnotationTypeFilter((Class<? extends Annotation>) feignClientClass));

        // Use the application context's ClassLoader
        scanner.setResourceLoader(applicationContext);

        for (String basePackage : basePackages) {
            System.out.println("Scanning package: " + basePackage);
            Set<BeanDefinition> candidateComponents = scanner.findCandidateComponents(basePackage);
            System.out.println("Found " + candidateComponents.size() + " candidate components in package: " + basePackage);

            for (BeanDefinition beanDefinition : candidateComponents) {
                String className = beanDefinition.getBeanClassName();
                System.out.println("Processing candidate: " + className);
                try {
                    // Use the application context's ClassLoader
                    ClassLoader classLoader = applicationContext.getClassLoader();
                    Class<?> clazz = classLoader.loadClass(className);
                    Annotation feignClientAnnotation = clazz.getAnnotation((Class<? extends Annotation>) feignClientClass);
                    if (feignClientAnnotation != null) {
                        System.out.println("Found FeignClient annotation on class: " + className);
                        FeignClientMetadata metadata = extractFeignClientMetadata(clazz, feignClientAnnotation);
                        feignClients.add(metadata);
                        System.out.println("Added FeignClient metadata for: " + metadata.getName());
                    } else {
                        System.out.println("No FeignClient annotation found on class: " + className);
                    }
                } catch (ClassNotFoundException e) {
                    System.err.println("Failed to load class: " + className);
                }
            }
        }
    }

    /**
     * Scans for Feign clients using the application context.
     *
     * @param feignClientClass the FeignClient annotation class
     */
    private void scanUsingApplicationContext(Class<?> feignClientClass) {
        System.out.println("Scanning for Feign clients using application context");
        try {
            // Get all beans of type Object (all beans)
            String[] beanNames = applicationContext.getBeanNamesForType(Object.class);
            System.out.println("Found " + beanNames.length + " beans in application context");

            for (String beanName : beanNames) {
                try {
                    Class<?> beanType = applicationContext.getType(beanName);
                    if (beanType != null && beanType.isInterface()) {
                        Annotation feignClientAnnotation = beanType.getAnnotation((Class<? extends Annotation>) feignClientClass);
                        if (feignClientAnnotation != null) {
                            System.out.println("Found FeignClient annotation on bean: " + beanName + " of type " + beanType.getName());
                            FeignClientMetadata metadata = extractFeignClientMetadata(beanType, feignClientAnnotation);
                            feignClients.add(metadata);
                            System.out.println("Added FeignClient metadata for: " + metadata.getName());
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error processing bean: " + beanName + ", error: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Error scanning application context: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Extracts metadata from a Feign client interface.
     *
     * @param clazz                 the Feign client interface class
     * @param feignClientAnnotation the FeignClient annotation
     * @return the Feign client metadata
     */
    private FeignClientMetadata extractFeignClientMetadata(Class<?> clazz, Annotation feignClientAnnotation) {
        FeignClientMetadata metadata = new FeignClientMetadata();
        metadata.setClassName(clazz.getName());

        // Extract FeignClient annotation values using reflection
        try {
            metadata.setName((String) AnnotationUtils.getValue(feignClientAnnotation, "name"));
            metadata.setUrl((String) AnnotationUtils.getValue(feignClientAnnotation, "url"));
            metadata.setPath((String) AnnotationUtils.getValue(feignClientAnnotation, "path"));

            // Get configuration class if specified
            Object configValue = AnnotationUtils.getValue(feignClientAnnotation, "configuration");
            if (configValue != null) {
                if (configValue instanceof Class<?>) {
                    Class<?> configuration = (Class<?>) configValue;
                    if (configuration != void.class) {
                        metadata.setConfiguration(configuration.getName());
                    }
                } else if (configValue instanceof Class<?>[]) {
                    Class<?>[] configurations = (Class<?>[]) configValue;
                    if (configurations.length > 0 && configurations[0] != void.class) {
                        metadata.setConfiguration(configurations[0].getName());
                    }
                }
            }

            // Get fallback class if specified
            Object fallbackValue = AnnotationUtils.getValue(feignClientAnnotation, "fallback");
            if (fallbackValue != null) {
                if (fallbackValue instanceof Class<?>) {
                    Class<?> fallback = (Class<?>) fallbackValue;
                    if (fallback != void.class) {
                        metadata.setFallback(fallback.getName());
                    }
                } else if (fallbackValue instanceof Class<?>[]) {
                    Class<?>[] fallbacks = (Class<?>[]) fallbackValue;
                    if (fallbacks.length > 0 && fallbacks[0] != void.class) {
                        metadata.setFallback(fallbacks[0].getName());
                    }
                }
            }

            // Get fallback factory class if specified
            Object fallbackFactoryValue = AnnotationUtils.getValue(feignClientAnnotation, "fallbackFactory");
            if (fallbackFactoryValue != null) {
                if (fallbackFactoryValue instanceof Class<?>) {
                    Class<?> fallbackFactory = (Class<?>) fallbackFactoryValue;
                    if (fallbackFactory != void.class) {
                        metadata.setFallbackFactory(fallbackFactory.getName());
                    }
                } else if (fallbackFactoryValue instanceof Class<?>[]) {
                    Class<?>[] fallbackFactories = (Class<?>[]) fallbackFactoryValue;
                    if (fallbackFactories.length > 0 && fallbackFactories[0] != void.class) {
                        metadata.setFallbackFactory(fallbackFactories[0].getName());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to extract FeignClient annotation values for class " + clazz.getName() + ": " + e.getMessage());
            e.printStackTrace();
        }

        // Extract method metadata
        System.out.println("Extracting methods for class: " + clazz.getName());
        Method[] methods = clazz.getDeclaredMethods();
        System.out.println("Found " + methods.length + " methods in class: " + clazz.getName());

        for (Method method : methods) {
            System.out.println("Processing method: " + method.getName());
            try {
                FeignMethodMetadata methodMetadata = extractMethodMetadata(method);
                if (methodMetadata != null) {
                    metadata.getMethods().add(methodMetadata);
                    System.out.println("Added method metadata for: " + method.getName());
                } else {
                    System.out.println("No metadata extracted for method: " + method.getName());
                }
            } catch (Exception e) {
                System.err.println("Failed to extract method metadata for " + method.getName() + ": " + e.getMessage());
            }
        }

        return metadata;
    }

    /**
     * Extracts metadata from a Feign client method.
     *
     * @param method the method
     * @return the method metadata
     */
    private FeignMethodMetadata extractMethodMetadata(Method method) {
        try {
            FeignMethodMetadata metadata = new FeignMethodMetadata();
            metadata.setName(method.getName());
            metadata.setReturnType(method.getReturnType().getName());
            System.out.println("Extracting metadata for method: " + method.getName() + " with return type: " + method.getReturnType().getName());

            // Extract HTTP method and path
            String httpMethod = null;
            String path = "";

            if (method.isAnnotationPresent(RequestMapping.class)) {
                RequestMapping annotation = method.getAnnotation(RequestMapping.class);
                RequestMethod[] methods = annotation.method();
                if (methods.length > 0) {
                    httpMethod = methods[0].name();
                }
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            } else if (method.isAnnotationPresent(GetMapping.class)) {
                GetMapping annotation = method.getAnnotation(GetMapping.class);
                httpMethod = "GET";
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            } else if (method.isAnnotationPresent(PostMapping.class)) {
                PostMapping annotation = method.getAnnotation(PostMapping.class);
                httpMethod = "POST";
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            } else if (method.isAnnotationPresent(PutMapping.class)) {
                PutMapping annotation = method.getAnnotation(PutMapping.class);
                httpMethod = "PUT";
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            } else if (method.isAnnotationPresent(DeleteMapping.class)) {
                DeleteMapping annotation = method.getAnnotation(DeleteMapping.class);
                httpMethod = "DELETE";
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            } else if (method.isAnnotationPresent(PatchMapping.class)) {
                PatchMapping annotation = method.getAnnotation(PatchMapping.class);
                httpMethod = "PATCH";
                String[] paths = annotation.path();
                if (paths.length > 0) {
                    path = paths[0];
                }
                metadata.setProduces(Arrays.asList(annotation.produces()));
                metadata.setConsumes(Arrays.asList(annotation.consumes()));
                metadata.setHeaders(Arrays.asList(annotation.headers()));
            }

            if (httpMethod == null) {
                // Skip methods without HTTP method annotations
                return null;
            }

            metadata.setHttpMethod(httpMethod);
            metadata.setPath(path);

            // Extract parameter metadata
            Parameter[] parameters = method.getParameters();
            for (Parameter parameter : parameters) {
                FeignParameterMetadata parameterMetadata = extractParameterMetadata(parameter);
                metadata.getParameters().add(parameterMetadata);
            }

            return metadata;
        } catch (Exception e) {
            System.err.println("Error extracting method metadata for " + method.getName() + ": " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Extracts metadata from a method parameter.
     *
     * @param parameter the parameter
     * @return the parameter metadata
     */
    private FeignParameterMetadata extractParameterMetadata(Parameter parameter) {
        FeignParameterMetadata metadata = new FeignParameterMetadata();
        metadata.setName(parameter.getName());
        metadata.setType(parameter.getType().getName());

        // Check for parameter annotations
        if (parameter.isAnnotationPresent(PathVariable.class)) {
            PathVariable annotation = parameter.getAnnotation(PathVariable.class);
            metadata.setAnnotationType("PathVariable");
            metadata.setRequired(annotation.required());
            if (!annotation.name().isEmpty()) {
                metadata.setName(annotation.name());
            } else if (!annotation.value().isEmpty()) {
                metadata.setName(annotation.value());
            }
        } else if (parameter.isAnnotationPresent(RequestParam.class)) {
            RequestParam annotation = parameter.getAnnotation(RequestParam.class);
            metadata.setAnnotationType("RequestParam");
            metadata.setRequired(annotation.required());
            metadata.setDefaultValue(annotation.defaultValue());
            if (!annotation.name().isEmpty()) {
                metadata.setName(annotation.name());
            } else if (!annotation.value().isEmpty()) {
                metadata.setName(annotation.value());
            }
        } else if (parameter.isAnnotationPresent(RequestBody.class)) {
            RequestBody annotation = parameter.getAnnotation(RequestBody.class);
            metadata.setAnnotationType("RequestBody");
            metadata.setRequired(annotation.required());
        } else if (parameter.isAnnotationPresent(RequestHeader.class)) {
            RequestHeader annotation = parameter.getAnnotation(RequestHeader.class);
            metadata.setAnnotationType("RequestHeader");
            metadata.setRequired(annotation.required());
            metadata.setDefaultValue(annotation.defaultValue());
            if (!annotation.name().isEmpty()) {
                metadata.setName(annotation.name());
            } else if (!annotation.value().isEmpty()) {
                metadata.setName(annotation.value());
            }
        } else {
            metadata.setAnnotationType("None");
        }

        return metadata;
    }
}
