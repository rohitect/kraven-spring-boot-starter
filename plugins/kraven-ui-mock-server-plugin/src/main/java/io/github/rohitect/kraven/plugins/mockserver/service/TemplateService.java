package io.github.rohitect.kraven.plugins.mockserver.service;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.helper.ConditionalHelpers;
import com.github.jknack.handlebars.helper.StringHelpers;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for template rendering.
 */
@Service
@Slf4j
public class TemplateService {

    private final Handlebars handlebars;
    private final Pattern simpleTemplatePattern = Pattern.compile("\\$\\{([^}]+)\\}");

    /**
     * Create a new TemplateService.
     */
    public TemplateService() {
        handlebars = new Handlebars();
        
        // Register helpers
        StringHelpers.register(handlebars);
        handlebars.registerHelper("eq", ConditionalHelpers.eq);
        handlebars.registerHelper("neq", ConditionalHelpers.neq);
        handlebars.registerHelper("lt", ConditionalHelpers.lt);
        handlebars.registerHelper("gt", ConditionalHelpers.gt);
        handlebars.registerHelper("lte", ConditionalHelpers.lte);
        handlebars.registerHelper("gte", ConditionalHelpers.gte);
        handlebars.registerHelper("and", ConditionalHelpers.and);
        handlebars.registerHelper("or", ConditionalHelpers.or);
        handlebars.registerHelper("not", ConditionalHelpers.not);
        
        // Register custom helpers
        handlebars.registerHelper("json", (context, options) -> {
            if (context == null) {
                return "null";
            }
            try {
                return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(context);
            } catch (Exception e) {
                return context.toString();
            }
        });
        
        handlebars.registerHelper("random", (context, options) -> {
            int min = options.hash("min", 0);
            int max = options.hash("max", 100);
            return min + (int) (Math.random() * ((max - min) + 1));
        });
        
        handlebars.registerHelper("timestamp", (context, options) -> {
            return System.currentTimeMillis();
        });
        
        handlebars.registerHelper("date", (context, options) -> {
            String format = options.hash("format", "yyyy-MM-dd'T'HH:mm:ss.SSSZ");
            return new java.text.SimpleDateFormat(format).format(new java.util.Date());
        });
    }

    /**
     * Get the list of available template engines.
     *
     * @return the list of available template engines
     */
    public List<String> getAvailableEngines() {
        return List.of("handlebars", "simple");
    }

    /**
     * Render a template with the given context.
     *
     * @param engine the template engine to use
     * @param templateString the template string
     * @param context the context for template rendering
     * @return the rendered template
     * @throws IOException if an error occurs during rendering
     */
    public String renderTemplate(String engine, String templateString, Map<String, Object> context) throws IOException {
        if (!StringUtils.hasText(templateString)) {
            return "";
        }
        
        if ("handlebars".equalsIgnoreCase(engine)) {
            return renderHandlebarsTemplate(templateString, context);
        } else if ("simple".equalsIgnoreCase(engine)) {
            return renderSimpleTemplate(templateString, context);
        } else {
            throw new IllegalArgumentException("Unsupported template engine: " + engine);
        }
    }

    /**
     * Render a Handlebars template with the given context.
     *
     * @param templateString the template string
     * @param context the context for template rendering
     * @return the rendered template
     * @throws IOException if an error occurs during rendering
     */
    private String renderHandlebarsTemplate(String templateString, Map<String, Object> context) throws IOException {
        Template template = handlebars.compileInline(templateString);
        return template.apply(context);
    }

    /**
     * Render a simple template with the given context.
     * Simple templates use ${variable} syntax.
     *
     * @param templateString the template string
     * @param context the context for template rendering
     * @return the rendered template
     */
    private String renderSimpleTemplate(String templateString, Map<String, Object> context) {
        if (context == null || context.isEmpty()) {
            return templateString;
        }
        
        StringBuffer result = new StringBuffer();
        Matcher matcher = simpleTemplatePattern.matcher(templateString);
        
        while (matcher.find()) {
            String variable = matcher.group(1);
            Object value = context.get(variable);
            String replacement = value != null ? value.toString() : matcher.group(0);
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        
        matcher.appendTail(result);
        return result.toString();
    }
}
