package io.github.rohitect.kraven.springboot.documentation.service;

import io.github.rohitect.kraven.springboot.businessflow.service.BusinessFlowScanner;
import io.github.rohitect.kraven.springboot.documentation.model.BusinessFlowTag;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for parsing business flow tags in documentation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessFlowTagParser {

    private final BusinessFlowScanner businessFlowScanner;

    // Map of documentation file ID to list of business flow tags
    private final Map<String, List<BusinessFlowTag>> businessFlowTagsMap = new ConcurrentHashMap<>();

    // Regex pattern for business flow tags
    private static final Pattern BUSINESS_FLOW_TAG_PATTERN = Pattern.compile(
            "```businessflow\\s+([^\\s]+)(?:\\s+\"([^\"]+)\")?\\s*\\n([\\s\\S]*?)\\n```",
            Pattern.MULTILINE
    );

    // Regex pattern for method entries in business flow tags
    private static final Pattern METHOD_ENTRY_PATTERN = Pattern.compile(
            "\\s*-\\s+([^:]+)(?:\\s*:\\s*(.+))?",
            Pattern.MULTILINE
    );

    /**
     * Parses business flow tags in a documentation file.
     */
    public void parseBusinessFlowTags(DocumentationFile docFile) {
        List<BusinessFlowTag> tags = new ArrayList<>();

        // Use getRawContent() to get the decoded content
        String content = docFile.getRawContent();
        if (content == null) {
            log.warn("No content to parse for business flow tags in file: {}", docFile.getPath());
            return;
        }

        Matcher tagMatcher = BUSINESS_FLOW_TAG_PATTERN.matcher(content);
        while (tagMatcher.find()) {
            String tagName = tagMatcher.group(1);
            String description = tagMatcher.group(2);
            String methodsBlock = tagMatcher.group(3);

            BusinessFlowTag tag = new BusinessFlowTag();
            tag.setName(tagName);
            tag.setDescription(description);
            tag.setDocumentationFileId(docFile.getId());

            // Parse method entries
            List<BusinessFlowTag.BusinessFlowMethod> methods = parseMethodEntries(methodsBlock);
            tag.setMethods(methods);

            tags.add(tag);
            log.debug("Found business flow tag '{}' with {} methods in file: {}",
                    tagName, methods.size(), docFile.getPath());
        }

        if (!tags.isEmpty()) {
            businessFlowTagsMap.put(docFile.getId(), tags);
        }
    }

    /**
     * Parses method entries in a business flow tag.
     */
    private List<BusinessFlowTag.BusinessFlowMethod> parseMethodEntries(String methodsBlock) {
        List<BusinessFlowTag.BusinessFlowMethod> methods = new ArrayList<>();

        Matcher methodMatcher = METHOD_ENTRY_PATTERN.matcher(methodsBlock);
        int order = 1;

        while (methodMatcher.find()) {
            String methodReference = methodMatcher.group(1).trim();
            String description = methodMatcher.group(2);

            // Parse method reference (ClassName.methodName)
            String[] parts = methodReference.split("\\.");
            if (parts.length < 2) {
                log.warn("Invalid method reference format: {}", methodReference);
                continue;
            }

            // Build the class name by joining all parts except the last one
            StringBuilder classNameBuilder = new StringBuilder();
            for (int i = 0; i < parts.length - 1; i++) {
                if (i > 0) {
                    classNameBuilder.append(".");
                }
                classNameBuilder.append(parts[i]);
            }
            String className = classNameBuilder.toString();
            String methodName = parts[parts.length - 1];

            // Create method entry
            BusinessFlowTag.BusinessFlowMethod method = new BusinessFlowTag.BusinessFlowMethod();
            method.setClassName(className);
            method.setSimpleClassName(getSimpleClassName(className));
            method.setMethodName(methodName);
            method.setMethodSignature(methodName + "()"); // Default signature
            method.setDescription(description);
            method.setOrder(order++);

            // Try to determine stereotype based on package or class name
            method.setStereotype(determineStereotype(className));

            methods.add(method);
        }

        return methods;
    }

    /**
     * Gets the simple class name from a fully qualified class name.
     */
    private String getSimpleClassName(String className) {
        int lastDotIndex = className.lastIndexOf('.');
        if (lastDotIndex > 0) {
            return className.substring(lastDotIndex + 1);
        }
        return className;
    }

    /**
     * Determines the stereotype of a class based on its name or package.
     */
    private String determineStereotype(String className) {
        String lowerClassName = className.toLowerCase();

        if (lowerClassName.endsWith("controller")) {
            return "Controller";
        } else if (lowerClassName.endsWith("service")) {
            return "Service";
        } else if (lowerClassName.endsWith("repository") || lowerClassName.endsWith("dao")) {
            return "Repository";
        } else if (lowerClassName.endsWith("component")) {
            return "Component";
        }

        // Check package
        if (className.contains(".controller.")) {
            return "Controller";
        } else if (className.contains(".service.")) {
            return "Service";
        } else if (className.contains(".repository.") || className.contains(".dao.")) {
            return "Repository";
        } else if (className.contains(".component.")) {
            return "Component";
        }

        return "Other";
    }

    /**
     * Gets all business flow tags for a documentation file.
     */
    public List<BusinessFlowTag> getBusinessFlowTags(String docFileId) {
        return businessFlowTagsMap.getOrDefault(docFileId, new ArrayList<>());
    }

    /**
     * Gets all business flow tags.
     */
    public Map<String, List<BusinessFlowTag>> getAllBusinessFlowTags() {
        return new HashMap<>(businessFlowTagsMap);
    }

    /**
     * Gets a business flow tag by name and documentation file ID.
     */
    public BusinessFlowTag getBusinessFlowTag(String docFileId, String tagName) {
        List<BusinessFlowTag> tags = businessFlowTagsMap.getOrDefault(docFileId, new ArrayList<>());
        return tags.stream()
                .filter(tag -> tag.getName().equals(tagName))
                .findFirst()
                .orElse(null);
    }

    /**
     * Clears all business flow tags.
     */
    public void clearBusinessFlowTags() {
        businessFlowTagsMap.clear();
    }
}
