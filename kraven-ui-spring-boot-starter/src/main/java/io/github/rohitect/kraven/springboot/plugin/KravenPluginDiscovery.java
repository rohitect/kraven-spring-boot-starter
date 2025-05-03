package io.github.rohitect.kraven.springboot.plugin;

import io.github.rohitect.kraven.plugin.KravenPlugin;
import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.springboot.KravenUiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Discovers plugins on the classpath.
 * This component scans for classes annotated with @KravenPlugin.
 */
@Component
@Slf4j
public class KravenPluginDiscovery {
    
    private final KravenPluginRegistry registry;
    private final KravenUiProperties properties;
    private final PathMatchingResourcePatternResolver resourceResolver;
    
    public KravenPluginDiscovery(KravenPluginRegistry registry, KravenUiProperties properties) {
        this.registry = registry;
        this.properties = properties;
        this.resourceResolver = new PathMatchingResourcePatternResolver();
        log.info("KravenPluginDiscovery initialized");
    }
    
    /**
     * Discover and register plugins.
     * This is called during application startup.
     */
    @PostConstruct
    public void discoverPlugins() {
        if (!properties.getPlugins().isEnabled()) {
            log.info("Plugin system is disabled");
            return;
        }
        
        if (properties.getPlugins().isAutoDiscovery()) {
            log.info("Auto-discovering plugins...");
            discoverAnnotatedPlugins();
            discoverPluginsFromManifest();
        }
    }
    
    /**
     * Discover plugins annotated with @KravenPlugin.
     * This scans the classpath for classes with the annotation.
     */
    private void discoverAnnotatedPlugins() {
        log.debug("Discovering plugins using annotation scanning");
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(KravenPlugin.class));
        
        for (String basePackage : properties.getPlugins().getBasePackages()) {
            log.debug("Scanning package: {}", basePackage);
            scanner.findCandidateComponents(basePackage).forEach(bd -> {
                try {
                    Class<?> pluginClass = Class.forName(bd.getBeanClassName());
                    if (KravenUIPlugin.class.isAssignableFrom(pluginClass)) {
                        KravenUIPlugin plugin = (KravenUIPlugin) pluginClass.getDeclaredConstructor().newInstance();
                        registry.registerPlugin(plugin);
                    } else {
                        log.warn("Class {} is annotated with @KravenPlugin but does not implement KravenUIPlugin", 
                                bd.getBeanClassName());
                    }
                } catch (Exception e) {
                    log.error("Failed to instantiate plugin: " + bd.getBeanClassName(), e);
                }
            });
        }
    }
    
    /**
     * Discover plugins from META-INF/kraven-plugin.properties files.
     * This looks for plugin descriptor files in the classpath.
     */
    private void discoverPluginsFromManifest() {
        log.debug("Discovering plugins using manifest files");
        try {
            Resource[] resources = resourceResolver.getResources("classpath*:META-INF/kraven-plugin.properties");
            log.debug("Found {} plugin manifest files", resources.length);
            
            for (Resource resource : resources) {
                try (InputStream is = resource.getInputStream()) {
                    Properties props = new Properties();
                    props.load(is);
                    
                    String mainClass = props.getProperty("mainClass");
                    if (mainClass == null || mainClass.isEmpty()) {
                        log.warn("Plugin manifest missing mainClass property: {}", resource.getFilename());
                        continue;
                    }
                    
                    log.debug("Loading plugin class: {}", mainClass);
                    Class<?> pluginClass = Class.forName(mainClass);
                    
                    if (KravenUIPlugin.class.isAssignableFrom(pluginClass)) {
                        KravenUIPlugin plugin = (KravenUIPlugin) pluginClass.getDeclaredConstructor().newInstance();
                        registry.registerPlugin(plugin);
                    } else {
                        log.warn("Class {} specified in manifest does not implement KravenUIPlugin", mainClass);
                    }
                } catch (Exception e) {
                    log.error("Failed to load plugin from manifest: " + resource.getFilename(), e);
                }
            }
        } catch (IOException e) {
            log.error("Error discovering plugin manifests", e);
        }
    }
}
