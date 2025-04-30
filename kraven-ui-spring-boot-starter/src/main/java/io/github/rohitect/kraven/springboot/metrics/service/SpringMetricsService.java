package io.github.rohitect.kraven.springboot.metrics.service;

import io.github.rohitect.kraven.springboot.metrics.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for collecting Spring metrics and details about Spring components.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpringMetricsService {

    private final ApplicationContext applicationContext;
    private final ConfigurableListableBeanFactory beanFactory;

    /**
     * Get details about all Spring beans.
     *
     * @return List of bean details
     */
    public List<SpringBeanDetails> getBeanDetails() {
        log.debug("Collecting Spring bean details");
        List<SpringBeanDetails> beanDetails = new ArrayList<>();
        
        for (String beanName : applicationContext.getBeanDefinitionNames()) {
            try {
                BeanDefinition beanDefinition = beanFactory.getBeanDefinition(beanName);
                Object bean = applicationContext.getBean(beanName);
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                String type = determineBeanType(beanClass);
                
                SpringBeanDetails details = SpringBeanDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .type(type)
                        .scope(beanDefinition.getScope())
                        .isPrimary(beanDefinition.isPrimary())
                        .dependencies(Arrays.asList(beanFactory.getDependenciesForBean(beanName)))
                        .tags(getBeanTags(beanClass))
                        .description(getBeanDescription(beanClass, type))
                        .build();
                
                beanDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for bean {}: {}", beanName, e.getMessage());
            }
        }
        
        return beanDetails;
    }

    /**
     * Get details about Spring controllers.
     *
     * @return List of controller details
     */
    public List<SpringControllerDetails> getControllerDetails() {
        log.debug("Collecting Spring controller details");
        List<SpringControllerDetails> controllerDetails = new ArrayList<>();
        
        Map<String, Object> controllers = applicationContext.getBeansWithAnnotation(Controller.class);
        controllers.putAll(applicationContext.getBeansWithAnnotation(RestController.class));
        
        for (Map.Entry<String, Object> entry : controllers.entrySet()) {
            try {
                String beanName = entry.getKey();
                Object bean = entry.getValue();
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                boolean isRestController = AnnotationUtils.findAnnotation(beanClass, RestController.class) != null;
                String baseUrl = "";
                RequestMapping requestMapping = AnnotationUtils.findAnnotation(beanClass, RequestMapping.class);
                if (requestMapping != null && requestMapping.value().length > 0) {
                    baseUrl = requestMapping.value()[0];
                }
                
                List<String> requestMappings = getRequestMappings(beanClass);
                
                SpringControllerDetails details = SpringControllerDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .packageName(beanClass.getPackage().getName())
                        .baseUrl(baseUrl)
                        .requestMappings(requestMappings)
                        .dependencies(Arrays.asList(beanFactory.getDependenciesForBean(beanName)))
                        .tags(getControllerTags(beanClass, isRestController))
                        .description(getControllerDescription(beanClass, isRestController))
                        .isRestController(isRestController)
                        .build();
                
                controllerDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for controller {}: {}", entry.getKey(), e.getMessage());
            }
        }
        
        return controllerDetails;
    }

    /**
     * Get details about Spring services.
     *
     * @return List of service details
     */
    public List<SpringServiceDetails> getServiceDetails() {
        log.debug("Collecting Spring service details");
        List<SpringServiceDetails> serviceDetails = new ArrayList<>();
        
        Map<String, Object> services = applicationContext.getBeansWithAnnotation(Service.class);
        
        for (Map.Entry<String, Object> entry : services.entrySet()) {
            try {
                String beanName = entry.getKey();
                Object bean = entry.getValue();
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                boolean isTransactional = AnnotationUtils.findAnnotation(beanClass, Transactional.class) != null;
                
                SpringServiceDetails details = SpringServiceDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .packageName(beanClass.getPackage().getName())
                        .dependencies(Arrays.asList(beanFactory.getDependenciesForBean(beanName)))
                        .tags(getServiceTags(beanClass, isTransactional))
                        .description(getServiceDescription(beanClass))
                        .isTransactional(isTransactional)
                        .build();
                
                serviceDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for service {}: {}", entry.getKey(), e.getMessage());
            }
        }
        
        return serviceDetails;
    }

    /**
     * Get details about Spring repositories.
     *
     * @return List of repository details
     */
    public List<SpringRepositoryDetails> getRepositoryDetails() {
        log.debug("Collecting Spring repository details");
        List<SpringRepositoryDetails> repositoryDetails = new ArrayList<>();
        
        Map<String, Object> repositories = applicationContext.getBeansWithAnnotation(Repository.class);
        
        for (Map.Entry<String, Object> entry : repositories.entrySet()) {
            try {
                String beanName = entry.getKey();
                Object bean = entry.getValue();
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                String repositoryType = determineRepositoryType(beanClass);
                String entityClass = determineEntityClass(beanClass);
                List<String> methods = getRepositoryMethods(beanClass);
                
                SpringRepositoryDetails details = SpringRepositoryDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .packageName(beanClass.getPackage().getName())
                        .entityClass(entityClass)
                        .repositoryType(repositoryType)
                        .methods(methods)
                        .tags(getRepositoryTags(beanClass, repositoryType))
                        .description(getRepositoryDescription(beanClass, repositoryType))
                        .build();
                
                repositoryDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for repository {}: {}", entry.getKey(), e.getMessage());
            }
        }
        
        return repositoryDetails;
    }

    /**
     * Get details about Spring components.
     *
     * @return List of component details
     */
    public List<SpringComponentDetails> getComponentDetails() {
        log.debug("Collecting Spring component details");
        List<SpringComponentDetails> componentDetails = new ArrayList<>();
        
        Map<String, Object> components = applicationContext.getBeansWithAnnotation(Component.class);
        
        // Filter out services, controllers, and repositories which are also components
        components.entrySet().removeIf(entry -> {
            Class<?> beanClass = AopProxyUtils.ultimateTargetClass(entry.getValue());
            return AnnotationUtils.findAnnotation(beanClass, Service.class) != null ||
                   AnnotationUtils.findAnnotation(beanClass, Controller.class) != null ||
                   AnnotationUtils.findAnnotation(beanClass, RestController.class) != null ||
                   AnnotationUtils.findAnnotation(beanClass, Repository.class) != null ||
                   AnnotationUtils.findAnnotation(beanClass, Configuration.class) != null;
        });
        
        for (Map.Entry<String, Object> entry : components.entrySet()) {
            try {
                String beanName = entry.getKey();
                Object bean = entry.getValue();
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                SpringComponentDetails details = SpringComponentDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .packageName(beanClass.getPackage().getName())
                        .dependencies(Arrays.asList(beanFactory.getDependenciesForBean(beanName)))
                        .tags(getComponentTags(beanClass))
                        .description(getComponentDescription(beanClass))
                        .build();
                
                componentDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for component {}: {}", entry.getKey(), e.getMessage());
            }
        }
        
        return componentDetails;
    }

    /**
     * Get details about Spring configuration classes.
     *
     * @return List of configuration details
     */
    public List<SpringConfigurationDetails> getConfigurationDetails() {
        log.debug("Collecting Spring configuration details");
        List<SpringConfigurationDetails> configurationDetails = new ArrayList<>();
        
        Map<String, Object> configurations = applicationContext.getBeansWithAnnotation(Configuration.class);
        
        for (Map.Entry<String, Object> entry : configurations.entrySet()) {
            try {
                String beanName = entry.getKey();
                Object bean = entry.getValue();
                Class<?> beanClass = AopProxyUtils.ultimateTargetClass(bean);
                
                boolean isAutoConfiguration = beanClass.getName().contains("AutoConfiguration");
                List<String> beanMethods = getBeanMethods(beanClass);
                List<String> importedConfigurations = getImportedConfigurations(beanClass);
                
                SpringConfigurationDetails details = SpringConfigurationDetails.builder()
                        .name(beanName)
                        .className(beanClass.getName())
                        .packageName(beanClass.getPackage().getName())
                        .beanMethods(beanMethods)
                        .importedConfigurations(importedConfigurations)
                        .tags(getConfigurationTags(beanClass, isAutoConfiguration))
                        .description(getConfigurationDescription(beanClass, isAutoConfiguration))
                        .isAutoConfiguration(isAutoConfiguration)
                        .build();
                
                configurationDetails.add(details);
            } catch (Exception e) {
                log.debug("Error collecting details for configuration {}: {}", entry.getKey(), e.getMessage());
            }
        }
        
        return configurationDetails;
    }

    // Helper methods

    private String determineBeanType(Class<?> beanClass) {
        if (AnnotationUtils.findAnnotation(beanClass, Controller.class) != null) {
            return "Controller";
        } else if (AnnotationUtils.findAnnotation(beanClass, RestController.class) != null) {
            return "RestController";
        } else if (AnnotationUtils.findAnnotation(beanClass, Service.class) != null) {
            return "Service";
        } else if (AnnotationUtils.findAnnotation(beanClass, Repository.class) != null) {
            return "Repository";
        } else if (AnnotationUtils.findAnnotation(beanClass, Configuration.class) != null) {
            return "Configuration";
        } else if (AnnotationUtils.findAnnotation(beanClass, Component.class) != null) {
            return "Component";
        } else {
            return "Bean";
        }
    }

    private List<String> getBeanTags(Class<?> beanClass) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        
        String type = determineBeanType(beanClass);
        tags.add(type.toLowerCase());
        
        if (AnnotationUtils.findAnnotation(beanClass, Transactional.class) != null) {
            tags.add("transactional");
        }
        
        return tags;
    }

    private String getBeanDescription(Class<?> beanClass, String type) {
        return "Spring " + type;
    }

    private List<String> getRequestMappings(Class<?> controllerClass) {
        List<String> mappings = new ArrayList<>();
        
        for (Method method : controllerClass.getDeclaredMethods()) {
            RequestMapping methodMapping = AnnotationUtils.findAnnotation(method, RequestMapping.class);
            if (methodMapping != null && methodMapping.value().length > 0) {
                mappings.add(methodMapping.value()[0]);
            }
        }
        
        return mappings;
    }

    private List<String> getControllerTags(Class<?> controllerClass, boolean isRestController) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        tags.add("controller");
        
        if (isRestController) {
            tags.add("rest");
            tags.add("api");
        } else {
            tags.add("mvc");
        }
        
        return tags;
    }

    private String getControllerDescription(Class<?> controllerClass, boolean isRestController) {
        return isRestController ? "REST Controller" : "MVC Controller";
    }

    private List<String> getServiceTags(Class<?> serviceClass, boolean isTransactional) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        tags.add("service");
        
        if (isTransactional) {
            tags.add("transactional");
        }
        
        return tags;
    }

    private String getServiceDescription(Class<?> serviceClass) {
        return "Spring Service";
    }

    private String determineRepositoryType(Class<?> repositoryClass) {
        String className = repositoryClass.getName();
        
        if (className.contains("JpaRepository") || className.contains("JPA")) {
            return "JPA";
        } else if (className.contains("MongoRepository") || className.contains("Mongo")) {
            return "MongoDB";
        } else if (className.contains("CassandraRepository") || className.contains("Cassandra")) {
            return "Cassandra";
        } else if (className.contains("RedisRepository") || className.contains("Redis")) {
            return "Redis";
        } else if (className.contains("JdbcRepository") || className.contains("JDBC")) {
            return "JDBC";
        } else {
            return "Repository";
        }
    }

    private String determineEntityClass(Class<?> repositoryClass) {
        // This is a simplified approach - in a real implementation, you would use reflection
        // to find the generic type parameters of the repository interface
        for (Class<?> iface : repositoryClass.getInterfaces()) {
            if (iface.getTypeParameters().length > 0) {
                return iface.getTypeParameters()[0].getName();
            }
        }
        return "Unknown";
    }

    private List<String> getRepositoryMethods(Class<?> repositoryClass) {
        return Arrays.stream(repositoryClass.getDeclaredMethods())
                .map(Method::getName)
                .collect(Collectors.toList());
    }

    private List<String> getRepositoryTags(Class<?> repositoryClass, String repositoryType) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        tags.add("repository");
        tags.add(repositoryType.toLowerCase());
        
        return tags;
    }

    private String getRepositoryDescription(Class<?> repositoryClass, String repositoryType) {
        return repositoryType + " Repository";
    }

    private List<String> getComponentTags(Class<?> componentClass) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        tags.add("component");
        
        return tags;
    }

    private String getComponentDescription(Class<?> componentClass) {
        return "Spring Component";
    }

    private List<String> getBeanMethods(Class<?> configClass) {
        return Arrays.stream(configClass.getDeclaredMethods())
                .filter(method -> AnnotationUtils.findAnnotation(method, org.springframework.context.annotation.Bean.class) != null)
                .map(Method::getName)
                .collect(Collectors.toList());
    }

    private List<String> getImportedConfigurations(Class<?> configClass) {
        org.springframework.context.annotation.Import importAnnotation = 
                AnnotationUtils.findAnnotation(configClass, org.springframework.context.annotation.Import.class);
        
        if (importAnnotation != null) {
            return Arrays.stream(importAnnotation.value())
                    .map(Class::getName)
                    .collect(Collectors.toList());
        }
        
        return Collections.emptyList();
    }

    private List<String> getConfigurationTags(Class<?> configClass, boolean isAutoConfiguration) {
        List<String> tags = new ArrayList<>();
        tags.add("spring");
        tags.add("configuration");
        
        if (isAutoConfiguration) {
            tags.add("auto-configuration");
        }
        
        return tags;
    }

    private String getConfigurationDescription(Class<?> configClass, boolean isAutoConfiguration) {
        return isAutoConfiguration ? "Spring Auto-Configuration" : "Spring Configuration";
    }
}
