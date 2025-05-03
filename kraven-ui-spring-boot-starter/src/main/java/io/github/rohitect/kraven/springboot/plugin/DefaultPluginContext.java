package io.github.rohitect.kraven.springboot.plugin;

import io.github.rohitect.kraven.plugin.KravenUIPlugin;
import io.github.rohitect.kraven.plugin.NavigationItem;
import io.github.rohitect.kraven.plugin.PluginContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Default implementation of PluginContext.
 * This provides the implementation for plugin context methods.
 */
@Slf4j
class DefaultPluginContext implements PluginContext {

    private final KravenUIPlugin plugin;
    private final ApplicationContext applicationContext;
    private final Map<String, NavigationItem> navigationItems;

    public DefaultPluginContext(
            KravenUIPlugin plugin,
            ApplicationContext applicationContext,
            Map<String, NavigationItem> navigationItems) {
        this.plugin = plugin;
        this.applicationContext = applicationContext;
        this.navigationItems = navigationItems;
        log.debug("DefaultPluginContext initialized for plugin: {}", plugin.getId());
    }

    @Override
    public void registerController(Object controller) {
        // Register the controller as a Spring bean
        String beanName = plugin.getId() + "." + controller.getClass().getSimpleName();
        registerBean(beanName, controller);

        // Check if the controller has the RestController annotation
        if (controller.getClass().isAnnotationPresent(RestController.class)) {
            log.info("Registered controller {} as a Spring bean. Spring will automatically detect its endpoints.", beanName);
        } else {
            log.warn("Registered {} as a bean, but it's not annotated with @RestController so endpoints won't be exposed.", beanName);
        }
    }

    @Override
    public void registerService(Object service) {
        // Register service with Spring
        String beanName = plugin.getId() + "." + service.getClass().getSimpleName();
        registerBean(beanName, service);
        log.debug("Registered service: {}", beanName);
    }

    @Override
    public void registerNavigationItem(NavigationItem item) {
        // Prefix the ID with the plugin ID to avoid conflicts
        String itemId = plugin.getId() + "." + item.getId();
        item.setId(itemId);
        navigationItems.put(itemId, item);
        log.debug("Registered navigation item: {}", itemId);
    }

    @Override
    public ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    @Override
    public <T> T getConfiguration(Class<T> configClass) {
        // Get plugin-specific configuration
        String prefix = "kraven.plugins." + plugin.getId();
        Environment environment = applicationContext.getEnvironment();
        return Binder.get(environment).bindOrCreate(prefix, configClass);
    }

    private void registerBean(String name, Object bean) {
        if (applicationContext instanceof ConfigurableApplicationContext) {
            ConfigurableListableBeanFactory beanFactory =
                    ((ConfigurableApplicationContext) applicationContext).getBeanFactory();
            beanFactory.registerSingleton(name, bean);
            log.debug("Registered bean: {}", name);
        } else {
            log.warn("Cannot register bean {} because ApplicationContext is not ConfigurableApplicationContext", name);
        }
    }
}
