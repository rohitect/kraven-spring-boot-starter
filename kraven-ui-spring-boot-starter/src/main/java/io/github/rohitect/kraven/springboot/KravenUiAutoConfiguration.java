package io.github.rohitect.kraven.springboot;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.ResourceTransformer;
import org.springframework.web.servlet.resource.ResourceTransformerChain;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Auto-configuration for Kraven UI.
 */
@Configuration
@ConditionalOnWebApplication
@EnableConfigurationProperties(KravenUiProperties.class)
@ConditionalOnProperty(prefix = "kraven.ui", name = "enabled", matchIfMissing = true)
@PropertySource("classpath:kraven-ui.properties")
public class KravenUiAutoConfiguration {

    private final KravenUiProperties properties;
    private final Environment environment;

    public KravenUiAutoConfiguration(KravenUiProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;

        // Try to get the version from the environment, fallback to the default in KravenUiProperties
        String version = environment.getProperty("kraven.ui.version");
        if (version != null && !version.isEmpty() && !version.contains("@project.version@")) {
            this.properties.setVersion(version);
        } else {
            // Keep the default version from KravenUiProperties
            System.out.println("Using default Kraven UI version: " + this.properties.getVersion());
        }

        // Log the configuration for debugging
        System.out.println("Kraven UI Configuration:");
        System.out.println("  Path: " + this.properties.getNormalizedPath());
        System.out.println("  Version: " + this.properties.getVersion());
        System.out.println("  Enabled: " + this.properties.isEnabled());
    }


    /**
     * Configures the kraven UI index controller.
     *
     * @return the kraven UI index controller
     */
    @Bean
    @ConditionalOnMissingBean
    public KravenUiIndexController kravenUiIndexController() {
        return new KravenUiIndexController(properties);
    }

    /**
     * Configures the MIME types for static assets.
     *
     * @return the WebMvcConfigurer for MIME type configuration
     */
    @Bean
    public WebMvcConfigurer mimeTypeConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
                // Configure MIME types for static assets
                Map<String, MediaType> mediaTypes = new HashMap<>();
                mediaTypes.put("css", MediaType.valueOf("text/css"));
                mediaTypes.put("js", MediaType.valueOf("application/javascript"));
                mediaTypes.put("mjs", MediaType.valueOf("application/javascript"));
                mediaTypes.put("html", MediaType.valueOf("text/html"));
                mediaTypes.put("json", MediaType.valueOf("application/json"));
                mediaTypes.put("svg", MediaType.valueOf("image/svg+xml"));
                mediaTypes.put("png", MediaType.valueOf("image/png"));
                mediaTypes.put("jpg", MediaType.valueOf("image/jpeg"));
                mediaTypes.put("jpeg", MediaType.valueOf("image/jpeg"));
                mediaTypes.put("gif", MediaType.valueOf("image/gif"));
                mediaTypes.put("ico", MediaType.valueOf("image/x-icon"));
                mediaTypes.put("woff", MediaType.valueOf("font/woff"));
                mediaTypes.put("woff2", MediaType.valueOf("font/woff2"));
                mediaTypes.put("ttf", MediaType.valueOf("font/ttf"));
                mediaTypes.put("eot", MediaType.valueOf("application/vnd.ms-fontobject"));
                configurer.mediaTypes(mediaTypes);

                // Ensure content negotiation uses file extension
                configurer.favorParameter(false)
                          .ignoreAcceptHeader(false)
                          .defaultContentType(MediaType.APPLICATION_JSON);
            }

            @Override
            public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
                // Add a custom ResourceHttpMessageConverter that handles CSS and JS files
                ResourceHttpMessageConverter resourceConverter = new ResourceHttpMessageConverter();
                resourceConverter.setSupportedMediaTypes(List.of(
                    MediaType.valueOf("text/css"),
                    MediaType.valueOf("application/javascript"),
                    MediaType.valueOf("image/svg+xml")
                ));
                converters.add(0, resourceConverter); // Add at the beginning to take precedence
            }
        };
    }

    /**
     * Creates a custom ResourceTransformer to ensure correct MIME types for assets.
     *
     * @return the ResourceTransformer
     */
    @Bean
    public ResourceTransformer mimeTypeResourceTransformer() {
        return new ResourceTransformer() {
            @Override
            public Resource transform(HttpServletRequest request, Resource resource, ResourceTransformerChain transformerChain) throws IOException {
                Resource transformed = transformerChain.transform(request, resource);

                // Set the correct MIME type based on the file extension
                String path = request.getRequestURI();
                if (path.endsWith(".css")) {
                    request.setAttribute("org.springframework.web.servlet.HandlerMapping.producibleMediaTypes",
                            MediaType.parseMediaTypes("text/css"));
                } else if (path.endsWith(".js")) {
                    request.setAttribute("org.springframework.web.servlet.HandlerMapping.producibleMediaTypes",
                            MediaType.parseMediaTypes("application/javascript"));
                }

                return transformed;
            }
        };
    }

    /**
     * Configures the WebMvc to serve the Kraven UI static resources.
     *
     * @return the WebMvcConfigurer
     */
    @Bean
    public WebMvcConfigurer kravenUiWebMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                String uiPath = properties.getNormalizedPath();
                System.out.println("Configuring resource handlers for UI path: " + uiPath);

                // Serve webjar resources directly
                registry.addResourceHandler("/webjars/**")
                        .addResourceLocations("classpath:/META-INF/resources/webjars/");

                // Also map UI path to webjar resources for consistency
                registry.addResourceHandler(uiPath + "/webjars/**")
                        .addResourceLocations("classpath:/META-INF/resources/webjars/");

                // Add a resource handler for the specific version of kraven-ui
                String kravenUiPath = uiPath + "/**";
                System.out.println("Adding resource handler for: " + kravenUiPath);
                registry.addResourceHandler(kravenUiPath)
                        .addResourceLocations("classpath:/META-INF/resources/webjars/kraven-ui/" + properties.getVersion() + "/")
                        .addResourceLocations("classpath:/static/");

                // If the UI path is /api-docs, also handle /api-docs/** pattern
                if (uiPath.equals("/api-docs")) {
                    System.out.println("Adding special handler for /api-docs path");
                    registry.addResourceHandler("/api-docs/**")
                            .addResourceLocations("classpath:/META-INF/resources/webjars/kraven-ui/" + properties.getVersion() + "/")
                            .addResourceLocations("classpath:/static/");
                }
            }

            @Override
            public void addViewControllers(ViewControllerRegistry registry) {
                // Add a redirect from the base path to the UI path
                String uiPath = properties.getNormalizedPath();
                if (!uiPath.equals("/")) {
                    System.out.println("Adding redirect from " + uiPath + " to " + uiPath + "/");
                    registry.addRedirectViewController(uiPath, uiPath + "/");
                }

                // If the UI path is /api-docs, also add a view controller for it
                if (uiPath.equals("/api-docs")) {
                    System.out.println("Adding view controller for /api-docs");
                    registry.addViewController("/api-docs").setViewName("forward:/api-docs/index.html");
                }
            }
        };
    }


}
