# Plugin-Based Feature Implementation Guide

## Introduction

This document provides a detailed implementation guide for the plugin-based feature architecture in Kraven UI. It outlines the technical approach, code structure, and integration points required to build a robust plugin system that allows third-party developers to extend Kraven UI functionality.

## Core Components Implementation

### 1. Plugin API Module

Create a new module `kraven-ui-plugin-api` that defines the core interfaces and classes for the plugin system.

#### Key Interfaces

```java
/**
 * Main interface that all plugins must implement
 */
public interface KravenUIPlugin {
    /**
     * Unique identifier for the plugin
     */
    String getId();

    /**
     * Human-readable name of the plugin
     */
    String getName();

    /**
     * Plugin version following semantic versioning
     */
    String getVersion();

    /**
     * Initialize the plugin with the provided context
     */
    void initialize(PluginContext context);

    /**
     * Start the plugin (called after all plugins are initialized)
     */
    void start();

    /**
     * Stop the plugin (called during shutdown)
     */
    void stop();
}

/**
 * Context provided to plugins during initialization
 */
public interface PluginContext {
    /**
     * Register a Spring controller
     */
    void registerController(Object controller);

    /**
     * Register a service bean
     */
    void registerService(Object service);

    /**
     * Register a navigation item for the UI
     */
    void registerNavigationItem(NavigationItem item);

    /**
     * Get the application context
     */
    ApplicationContext getApplicationContext();

    /**
     * Get plugin-specific configuration
     */
    <T> T getConfiguration(Class<T> configClass);
}

/**
 * Represents a navigation item in the UI
 */
public class NavigationItem {
    private String id;
    private String label;

    // Builder pattern implementation
    public static Builder builder() {
        return new Builder();
    }

    // Getters and setters

    public static class Builder {
        // Builder implementation
    }
}

/**
 * Annotation to mark a class as a Kraven UI plugin
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface KravenPlugin {
    /**
     * Plugin ID
     */
    String id();

    /**
     * Plugin name
     */
    String name();

    /**
     * Plugin version
     */
    String version();

    /**
     * Plugin description
     */
    String description() default "";

    /**
     * Plugin provider
     */
    String provider() default "";
}
```

### 2. Plugin Registry Implementation

```java
/**
 * Registry for managing plugins
 */
@Component
public class KravenPluginRegistry {
    private final Logger log = LoggerFactory.getLogger(KravenPluginRegistry.class);
    private final Map<String, KravenUIPlugin> plugins = new ConcurrentHashMap<>();
    private final Map<String, NavigationItem> navigationItems = new ConcurrentHashMap<>();
    private final ApplicationContext applicationContext;

    public KravenPluginRegistry(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    /**
     * Register a plugin
     */
    public void registerPlugin(KravenUIPlugin plugin) {
        String pluginId = plugin.getId();
        log.info("Registering plugin: {} ({})", plugin.getName(), pluginId);

        if (plugins.containsKey(pluginId)) {
            throw new IllegalStateException("Plugin with ID " + pluginId + " is already registered");
        }

        PluginContext context = createPluginContext(plugin);
        plugin.initialize(context);
        plugins.put(pluginId, plugin);
        log.info("Plugin registered successfully: {}", pluginId);
    }

    /**
     * Start all registered plugins
     */
    public void startPlugins() {
        log.info("Starting {} registered plugins", plugins.size());
        plugins.values().forEach(plugin -> {
            try {
                plugin.start();
                log.info("Started plugin: {} ({})", plugin.getName(), plugin.getId());
            } catch (Exception e) {
                log.error("Failed to start plugin: " + plugin.getId(), e);
            }
        });
    }

    /**
     * Stop all registered plugins
     */
    public void stopPlugins() {
        log.info("Stopping {} registered plugins", plugins.size());
        plugins.values().forEach(plugin -> {
            try {
                plugin.stop();
                log.info("Stopped plugin: {} ({})", plugin.getName(), plugin.getId());
            } catch (Exception e) {
                log.error("Failed to stop plugin: " + plugin.getId(), e);
            }
        });
    }

    /**
     * Get all registered plugins
     */
    public Collection<KravenUIPlugin> getPlugins() {
        return Collections.unmodifiableCollection(plugins.values());
    }

    /**
     * Get all registered navigation items
     */
    public Collection<NavigationItem> getNavigationItems() {
        return Collections.unmodifiableCollection(navigationItems.values());
    }

    /**
     * Create a plugin context for the given plugin
     */
    private PluginContext createPluginContext(KravenUIPlugin plugin) {
        return new DefaultPluginContext(plugin, applicationContext, navigationItems);
    }
}

/**
 * Default implementation of PluginContext
 */
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
    }

    @Override
    public void registerController(Object controller) {
        // Register controller with Spring
        String beanName = plugin.getId() + "." + controller.getClass().getSimpleName();
        registerBean(beanName, controller);
    }

    @Override
    public void registerService(Object service) {
        // Register service with Spring
        String beanName = plugin.getId() + "." + service.getClass().getSimpleName();
        registerBean(beanName, service);
    }

    @Override
    public void registerNavigationItem(NavigationItem item) {
        // Prefix the ID with the plugin ID to avoid conflicts
        String itemId = plugin.getId() + "." + item.getId();
        item.setId(itemId);
        navigationItems.put(itemId, item);
    }

    @Override
    public ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    @Override
    public <T> T getConfiguration(Class<T> configClass) {
        // Get plugin-specific configuration
        String prefix = "kraven.plugins." + plugin.getId();
        return applicationContext.getBean(ConfigurationPropertiesBinder.class)
                .bindOrCreate(prefix, configClass);
    }

    private void registerBean(String name, Object bean) {
        ConfigurableApplicationContext context = (ConfigurableApplicationContext) applicationContext;
        context.getBeanFactory().registerSingleton(name, bean);
    }
}
```

### 3. Plugin Discovery Implementation

```java
/**
 * Discovers plugins on the classpath
 */
@Component
public class KravenPluginDiscovery {
    private final Logger log = LoggerFactory.getLogger(KravenPluginDiscovery.class);
    private final KravenPluginRegistry registry;
    private final KravenUiProperties properties;

    public KravenPluginDiscovery(KravenPluginRegistry registry, KravenUiProperties properties) {
        this.registry = registry;
        this.properties = properties;
    }

    /**
     * Discover and register plugins
     */
    @PostConstruct
    public void discoverPlugins() {
        if (!properties.getPlugins().isEnabled()) {
            log.info("Plugin system is disabled");
            return;
        }

        if (properties.getPlugins().isAutoDiscovery()) {
            discoverAnnotatedPlugins();
            discoverPluginsFromManifest();
        }
    }

    /**
     * Discover plugins annotated with @KravenPlugin
     */
    private void discoverAnnotatedPlugins() {
        log.debug("Discovering plugins using annotation scanning");
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(KravenPlugin.class));

        for (String basePackage : properties.getPlugins().getBasePackages()) {
            for (BeanDefinition bd : scanner.findCandidateComponents(basePackage)) {
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
            }
        }
    }

    /**
     * Discover plugins from META-INF/kraven-plugin.json files
     */
    private void discoverPluginsFromManifest() {
        log.debug("Discovering plugins using manifest files");
        try {
            Enumeration<URL> resources = getClass().getClassLoader().getResources("META-INF/kraven-plugin.json");
            while (resources.hasMoreElements()) {
                URL url = resources.nextElement();
                try (InputStream is = url.openStream()) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode manifest = mapper.readTree(is);

                    String mainClass = manifest.get("mainClass").asText();
                    Class<?> pluginClass = Class.forName(mainClass);

                    if (KravenUIPlugin.class.isAssignableFrom(pluginClass)) {
                        KravenUIPlugin plugin = (KravenUIPlugin) pluginClass.getDeclaredConstructor().newInstance();
                        registry.registerPlugin(plugin);
                    } else {
                        log.warn("Class {} specified in manifest does not implement KravenUIPlugin", mainClass);
                    }
                } catch (Exception e) {
                    log.error("Failed to load plugin from manifest: " + url, e);
                }
            }
        } catch (IOException e) {
            log.error("Error discovering plugin manifests", e);
        }
    }
}
```

### 4. Plugin Lifecycle Management

```java
/**
 * Manages plugin lifecycle
 */
@Component
public class KravenPluginLifecycleManager {
    private final Logger log = LoggerFactory.getLogger(KravenPluginLifecycleManager.class);
    private final KravenPluginRegistry registry;

    public KravenPluginLifecycleManager(KravenPluginRegistry registry) {
        this.registry = registry;
    }

    /**
     * Start all plugins after application is ready
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Application is ready, starting plugins");
        registry.startPlugins();
    }

    /**
     * Stop all plugins before application shutdown
     */
    @PreDestroy
    public void onApplicationShutdown() {
        log.info("Application is shutting down, stopping plugins");
        registry.stopPlugins();
    }
}
```

### 5. UI Integration

#### Backend Controller for UI Navigation

```java
/**
 * Controller that provides plugin information to the UI
 */
@RestController
@RequestMapping("/kraven/api/plugins")
public class KravenPluginController {
    private final KravenPluginRegistry registry;

    public KravenPluginController(KravenPluginRegistry registry) {
        this.registry = registry;
    }

    /**
     * Get all registered plugins
     */
    @GetMapping
    public List<PluginInfo> getPlugins() {
        return registry.getPlugins().stream()
                .map(this::toPluginInfo)
                .collect(Collectors.toList());
    }

    /**
     * Get all navigation items from plugins
     */
    @GetMapping("/navigation")
    public List<NavigationItem> getNavigationItems() {
        return new ArrayList<>(registry.getNavigationItems());
    }

    private PluginInfo toPluginInfo(KravenUIPlugin plugin) {
        return new PluginInfo(
                plugin.getId(),
                plugin.getName(),
                plugin.getVersion()
        );
    }

    /**
     * DTO for plugin information
     */
    public static class PluginInfo {
        private final String id;
        private final String name;
        private final String version;

        public PluginInfo(String id, String name, String version) {
            this.id = id;
            this.name = name;
            this.version = version;
        }

        // Getters
    }
}
```

#### Frontend Integration

The frontend will need to fetch plugin navigation items and dynamically build the UI:

```typescript
// plugins.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
}

export interface NavigationItem {
  id: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class PluginsService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  getPlugins(): Observable<PluginInfo[]> {
    return this.http.get<PluginInfo[]>(`${this.configService.getApiBasePath()}/plugins`);
  }

  getNavigationItems(): Observable<NavigationItem[]> {
    return this.http.get<NavigationItem[]>(`${this.configService.getApiBasePath()}/plugins/navigation`);
  }
}
```

The header component will use this service to show or hide plugin navigation items:

```typescript
// header.component.ts
import { Component, OnInit } from '@angular/core';
import { PluginsService, NavigationItem } from '../../services/plugins.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  pluginNavigationItems: NavigationItem[] = [];

  constructor(private pluginsService: PluginsService) {}

  ngOnInit(): void {
    // Fetch plugin navigation items
    this.pluginsService.getNavigationItems().subscribe({
      next: (items) => {
        this.pluginNavigationItems = items;
      },
      error: (err) => {
        console.error('Failed to load plugin navigation items:', err);
      }
    });
  }
}
```

And in the header template:

```html
<!-- header.component.html -->
<nav class="header-nav">
  <!-- Standard navigation items -->
  <a routerLink="/overview">Overview</a>
  <a routerLink="/api-docs">API Docs</a>

  <!-- Plugin navigation items - only shown if available -->
  <ng-container *ngFor="let item of pluginNavigationItems">
    <a [routerLink]="'/' + item.id">{{ item.label }}</a>
  </ng-container>
</nav>
```

The app routing module will need to be updated to handle dynamic routes:

```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PluginNotFoundComponent } from './components/plugin-not-found/plugin-not-found.component';

// Static routes
const routes: Routes = [
  { path: '', redirectTo: '/overview', pathMatch: 'full' },
  { path: 'overview', component: OverviewComponent },
  { path: 'api-docs', component: ApiDocsComponent },

  // Wildcard route for plugin paths
  { path: ':pluginId', component: PluginNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```
```

### 6. Configuration Properties

```java
/**
 * Configuration properties for the plugin system
 */
@ConfigurationProperties(prefix = "kraven.ui")
public class KravenUiProperties {
    // Existing properties...

    /**
     * Plugin system configuration
     */
    private Plugins plugins = new Plugins();

    // Getters and setters

    /**
     * Plugin system configuration properties
     */
    @Data
    public static class Plugins {
        /**
         * Enable or disable the plugin system
         */
        private boolean enabled = true;

        /**
         * Enable or disable auto-discovery of plugins
         */
        private boolean autoDiscovery = true;

        /**
         * Base packages to scan for plugins
         */
        private String[] basePackages = {"io.github", "com", "org", "net"};
    }
}
```

## Example Plugin Implementation

### 1. Plugin Project Structure

```
example-plugin/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── io/
│   │   │       └── github/
│   │   │           └── rohitect/
│   │   │               └── kraven/
│   │   │                   └── plugins/
│   │   │                       └── example/
│   │   │                           ├── ExamplePlugin.java
│   │   │                           ├── controller/
│   │   │                           │   └── ExampleController.java
│   │   │                           └── service/
│   │   │                               └── ExampleService.java
│   │   └── resources/
│   │       └── META-INF/
│   │           └── kraven-plugin.json
│   └── test/
│       └── java/
│           └── io/
│               └── github/
│                   └── rohitect/
│                       └── kraven/
│                           └── plugins/
│                               └── example/
│                                   └── ExamplePluginTest.java
└── README.md
```

### 2. Plugin Implementation

```java
/**
 * Example plugin implementation
 */
@KravenPlugin(
    id = "example",
    name = "Example Plugin",
    version = "1.0.0",
    description = "An example plugin for Kraven UI",
    provider = "Rohitect"
)
public class ExamplePlugin implements KravenUIPlugin {
    private final Logger log = LoggerFactory.getLogger(ExamplePlugin.class);

    @Override
    public String getId() {
        return "example";
    }

    @Override
    public String getName() {
        return "Example Plugin";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public void initialize(PluginContext context) {
        log.info("Initializing Example Plugin");

        // Register controllers
        context.registerController(new ExampleController());

        // Register services
        context.registerService(new ExampleService());

        // Register navigation item
        context.registerNavigationItem(
            NavigationItem.builder()
                .id("example")
                .label("Example Feature")
                .build()
        );
    }

    @Override
    public void start() {
        log.info("Starting Example Plugin");
    }

    @Override
    public void stop() {
        log.info("Stopping Example Plugin");
    }
}
```

### 3. Plugin Controller

```java
/**
 * Example controller for the plugin
 */
@RestController
@RequestMapping("/kraven/api/plugins/example")
public class ExampleController {
    private final ExampleService service;

    public ExampleController() {
        this.service = new ExampleService();
    }

    @GetMapping("/data")
    public Map<String, Object> getData() {
        return Map.of(
            "message", "Hello from Example Plugin!",
            "timestamp", System.currentTimeMillis(),
            "items", service.getItems()
        );
    }
}
```

### 4. Plugin Service

```java
/**
 * Example service for the plugin
 */
public class ExampleService {
    public List<String> getItems() {
        return List.of("Item 1", "Item 2", "Item 3");
    }
}
```

### 5. Plugin Manifest

```json
{
  "pluginId": "example",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "An example plugin for Kraven UI",
  "provider": "Rohitect",
  "requires": {
    "kravenCore": ">=1.0.0",
    "java": ">=11"
  },
  "mainClass": "io.github.rohitect.kraven.plugins.example.ExamplePlugin",
  "ui": {
    "navigationItem": {
      "id": "example",
      "label": "Example Feature",
      "icon": "example-icon",
      "order": 100,
      "route": "/example"
    }
  }
}
```

### 6. Plugin Maven Configuration

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>io.github.rohitect.kraven.plugins</groupId>
    <artifactId>example-plugin</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <name>Kraven UI Example Plugin</name>
    <description>An example plugin for Kraven UI</description>

    <properties>
        <java.version>11</java.version>
        <maven.compiler.source>${java.version}</maven.compiler.source>
        <maven.compiler.target>${java.version}</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <kraven.version>1.0.0</kraven.version>
    </properties>

    <dependencies>
        <!-- Kraven UI Plugin API -->
        <dependency>
            <groupId>io.github.rohitect</groupId>
            <artifactId>kraven-ui-plugin-api</artifactId>
            <version>${kraven.version}</version>
            <scope>provided</scope>
        </dependency>

        <!-- Spring Web (provided by the host application) -->
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-web</artifactId>
            <version>6.0.0</version>
            <scope>provided</scope>
        </dependency>

        <!-- Logging -->
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>2.0.0</version>
            <scope>provided</scope>
        </dependency>

        <!-- Test dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.9.0</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.mockito</groupId>
            <artifactId>mockito-core</artifactId>
            <version>4.8.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Compiler plugin -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.10.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>

            <!-- Assembly plugin to create a fat JAR -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-assembly-plugin</artifactId>
                <version>3.4.2</version>
                <configuration>
                    <descriptorRefs>
                        <descriptorRef>jar-with-dependencies</descriptorRef>
                    </descriptorRefs>
                </configuration>
                <executions>
                    <execution>
                        <id>make-assembly</id>
                        <phase>package</phase>
                        <goals>
                            <goal>single</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

## Integration with Kraven UI Core

### 1. Auto-Configuration

```java
/**
 * Auto-configuration for the plugin system
 */
@Configuration
@ConditionalOnProperty(prefix = "kraven.ui.plugins", name = "enabled", matchIfMissing = true)
@EnableConfigurationProperties(KravenUiProperties.class)
public class KravenPluginAutoConfiguration {

    @Bean
    public KravenPluginRegistry kravenPluginRegistry(ApplicationContext applicationContext) {
        return new KravenPluginRegistry(applicationContext);
    }

    @Bean
    public KravenPluginDiscovery kravenPluginDiscovery(
            KravenPluginRegistry registry,
            KravenUiProperties properties) {
        return new KravenPluginDiscovery(registry, properties);
    }

    @Bean
    public KravenPluginLifecycleManager kravenPluginLifecycleManager(KravenPluginRegistry registry) {
        return new KravenPluginLifecycleManager(registry);
    }

    @Bean
    public KravenPluginController kravenPluginController(KravenPluginRegistry registry) {
        return new KravenPluginController(registry);
    }
}
```

### 2. Update KravenUiIndexController

```java
/**
 * Controller for serving the Kraven UI index.html with injected configuration
 */
@Controller
public class KravenUiIndexController {
    // Existing code...

    private final KravenPluginRegistry pluginRegistry;

    public KravenUiIndexController(
            KravenUiEnhancedProperties properties,
            KravenUiConfigurationInitializer configInitializer,
            KravenPluginRegistry pluginRegistry) {
        this.properties = properties;
        this.configInitializer = configInitializer;
        this.pluginRegistry = pluginRegistry;
    }

    /**
     * Serve the index.html with injected configuration
     */
    @GetMapping(value = "${kraven.ui.path:}/index.html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getIndex() {
        // Existing code...

        // Add plugin navigation items to the configuration
        List<Map<String, Object>> navigationItems = pluginRegistry.getNavigationItems().stream()
                .map(item -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", item.getId());
                    map.put("label", item.getLabel());
                    return map;
                })
                .collect(Collectors.toList());

        config.put("plugins", Map.of(
                "enabled", true,
                "navigationItems", navigationItems
        ));

        // Continue with existing code...
    }
}
```

## Using a Plugin in an Application

### 1. Add Plugin Dependency

```xml
<dependency>
    <groupId>io.github.rohitect.kraven.plugins</groupId>
    <artifactId>example-plugin</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Configure Plugin (Optional)

```yaml
kraven:
  ui:
    plugins:
      enabled: true
      auto-discovery: true
      example:
        enabled: true
        custom-property: value
```

## Testing Plugins

### 1. Unit Testing

```java
/**
 * Unit test for ExamplePlugin
 */
public class ExamplePluginTest {

    private ExamplePlugin plugin;
    private PluginContext context;

    @BeforeEach
    public void setup() {
        plugin = new ExamplePlugin();
        context = mock(PluginContext.class);
    }

    @Test
    public void testInitialize() {
        // When
        plugin.initialize(context);

        // Then
        verify(context).registerController(any(ExampleController.class));
        verify(context).registerService(any(ExampleService.class));
        verify(context).registerNavigationItem(any(NavigationItem.class));
    }

    @Test
    public void testLifecycle() {
        // No exceptions should be thrown
        plugin.start();
        plugin.stop();
    }

    @Test
    public void testMetadata() {
        assertEquals("example", plugin.getId());
        assertEquals("Example Plugin", plugin.getName());
        assertEquals("1.0.0", plugin.getVersion());
    }
}
```

### 2. Integration Testing

```java
/**
 * Integration test for ExamplePlugin
 */
@SpringBootTest
public class ExamplePluginIntegrationTest {

    @Autowired
    private KravenPluginRegistry registry;

    @Autowired
    private ApplicationContext context;

    @Test
    public void testPluginRegistration() {
        // Given
        ExamplePlugin plugin = new ExamplePlugin();

        // When
        registry.registerPlugin(plugin);

        // Then
        Collection<KravenUIPlugin> plugins = registry.getPlugins();
        assertTrue(plugins.contains(plugin));
    }

    @Test
    public void testNavigationItems() {
        // Given
        ExamplePlugin plugin = new ExamplePlugin();
        registry.registerPlugin(plugin);

        // When
        Collection<NavigationItem> items = registry.getNavigationItems();

        // Then
        assertFalse(items.isEmpty());
        Optional<NavigationItem> exampleItem = items.stream()
                .filter(item -> item.getId().contains("example"))
                .findFirst();
        assertTrue(exampleItem.isPresent());
        assertEquals("Example Feature", exampleItem.get().getLabel());
    }
}
```

## Deployment Considerations

### 1. Packaging

Plugins should be packaged as JAR files with all required dependencies included. The Maven Assembly Plugin can be used to create a "fat JAR" that includes all dependencies.

### 2. Versioning

Plugins should follow semantic versioning (MAJOR.MINOR.PATCH) to indicate compatibility changes:

- MAJOR: Incompatible API changes
- MINOR: Backwards-compatible new functionality
- PATCH: Backwards-compatible bug fixes

### 3. Distribution

Plugins can be distributed through:

- Maven repositories
- Direct JAR downloads
- Custom plugin marketplaces

### 4. Documentation

Each plugin should include:

- README with installation and usage instructions
- API documentation
- Configuration reference
- Compatibility information

## Conclusion

This implementation guide provides a comprehensive approach to building a plugin-based architecture for Kraven UI. By following these guidelines, developers can create a flexible, extensible system that allows third-party plugins to seamlessly integrate with the core library.

The plugin system enables:

1. Dynamic discovery and registration of plugins
2. Clean separation of core and plugin functionality
3. Flexible UI integration through dynamic navigation
4. Standardized plugin development workflow
5. Robust lifecycle management

This architecture will foster a community of plugin developers who can extend Kraven UI with custom features without modifying the core codebase.
