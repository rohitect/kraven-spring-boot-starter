package io.github.rohitect.kraven.springboot.documentation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.rohitect.kraven.springboot.config.KravenUiEnhancedProperties;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationConfig;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationFile;
import io.github.rohitect.kraven.springboot.documentation.model.DocumentationGroup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.FileCopyUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for scanning and managing documentation files.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentationScanner implements ApplicationListener<ApplicationReadyEvent> {

    private final KravenUiEnhancedProperties properties;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final BusinessFlowTagParser businessFlowTagParser;

    private final Map<String, DocumentationFile> documentationFiles = new ConcurrentHashMap<>();
    private final Map<String, DocumentationGroup> documentationGroups = new ConcurrentHashMap<>();
    private DocumentationConfig documentationConfig;

    private static final String DEFAULT_DOCS_PATH = "classpath:kraven-docs/";
    private static final String CONFIG_FILE_NAME = "doc-config.json";
    private static final Pattern MARKDOWN_PATTERN = Pattern.compile(".*\\.(md|markdown)$", Pattern.CASE_INSENSITIVE);

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (properties.getDocumentation().isEnabled()) {
            log.info("Scanning for documentation files...");
            scanDocumentation();
        }
    }

    /**
     * Scans for documentation files and organizes them into groups.
     */
    public void scanDocumentation() {
        documentationFiles.clear();
        documentationGroups.clear();

        String docsPath = properties.getDocumentation().getPath();
        if (!StringUtils.hasText(docsPath)) {
            docsPath = DEFAULT_DOCS_PATH;
        }

        log.info("Scanning for documentation files in: {}", docsPath);

        try {
            // Load configuration file
            Resource configResource = resourceLoader.getResource(docsPath + CONFIG_FILE_NAME);
            if (configResource.exists()) {
                try (Reader reader = new InputStreamReader(configResource.getInputStream(), StandardCharsets.UTF_8)) {
                    String configJson = FileCopyUtils.copyToString(reader);
                    documentationConfig = objectMapper.readValue(configJson, DocumentationConfig.class);
                    log.info("Loaded documentation configuration: {}", documentationConfig.getTitle());
                }
            } else {
                log.info("No documentation configuration file found, using default configuration");
                documentationConfig = new DocumentationConfig();
            }

            // Scan for documentation files
            Resource docsResource = resourceLoader.getResource(docsPath);
            if (!docsResource.exists()) {
                log.warn("Documentation directory does not exist: {}", docsPath);
                return;
            }

            // If no groups are defined in the config, create a default group
            if (documentationConfig.getGroups().isEmpty()) {
                DocumentationConfig.DocumentationGroupConfig defaultGroup = new DocumentationConfig.DocumentationGroupConfig();
                defaultGroup.setId("default");
                defaultGroup.setTitle("Documentation");
                defaultGroup.setOrder(1);
                defaultGroup.getInclude().add("**/*.md");
                documentationConfig.getGroups().add(defaultGroup);
            }

            // Process each group
            for (DocumentationConfig.DocumentationGroupConfig groupConfig : documentationConfig.getGroups()) {
                DocumentationGroup group = new DocumentationGroup();
                group.setId(groupConfig.getId());
                group.setTitle(groupConfig.getTitle());
                group.setDescription(groupConfig.getDescription());
                group.setOverviewPath(groupConfig.getOverviewPath());
                group.setOrder(groupConfig.getOrder());
                group.setIcon(groupConfig.getIcon());

                // Find files for this group
                List<DocumentationFile> groupFiles = scanGroupFiles(docsPath, groupConfig);
                group.setFiles(groupFiles);

                // Set overview file if specified
                if (StringUtils.hasText(groupConfig.getOverviewPath())) {
                    DocumentationFile overviewFile = findFileByPath(groupFiles, groupConfig.getOverviewPath());
                    if (overviewFile != null) {
                        overviewFile.setOverview(true);
                        group.setOverview(overviewFile);
                    }
                }

                documentationGroups.put(group.getId(), group);
            }

            log.info("Found {} documentation files in {} groups", documentationFiles.size(), documentationGroups.size());

        } catch (IOException e) {
            log.error("Error scanning documentation files", e);
        }
    }

    /**
     * Scans for files in a group based on include/exclude patterns.
     */
    private List<DocumentationFile> scanGroupFiles(String basePath, DocumentationConfig.DocumentationGroupConfig groupConfig) {
        List<DocumentationFile> groupFiles = new ArrayList<>();
        AntPathMatcher pathMatcher = new AntPathMatcher();

        try {
            // Get all resources in the base path
            Resource baseResource = resourceLoader.getResource(basePath);
            if (!baseResource.exists()) {
                return groupFiles;
            }

            // Process include patterns
            for (String includePattern : groupConfig.getInclude()) {
                String fullPattern = basePath;
                if (!fullPattern.endsWith("/")) {
                    fullPattern += "/";
                }
                fullPattern += includePattern;

                Resource[] resources = org.springframework.core.io.support.ResourcePatternUtils
                        .getResourcePatternResolver(resourceLoader)
                        .getResources(fullPattern);

                for (Resource resource : resources) {
                    String resourcePath = resource.getURI().toString();
                    String relativePath = extractRelativePath(resourcePath, basePath);

                    // Skip if this is the config file
                    if (relativePath.equals(CONFIG_FILE_NAME)) {
                        continue;
                    }

                    // Skip if this file matches any exclude pattern
                    boolean excluded = false;
                    for (String excludePattern : groupConfig.getExclude()) {
                        if (pathMatcher.match(excludePattern, relativePath)) {
                            excluded = true;
                            break;
                        }
                    }

                    if (excluded) {
                        continue;
                    }

                    // Only process Markdown files
                    if (MARKDOWN_PATTERN.matcher(relativePath).matches()) {
                        DocumentationFile docFile = loadDocumentationFile(resource, relativePath, groupConfig.getId());
                        if (docFile != null) {
                            groupFiles.add(docFile);
                            documentationFiles.put(docFile.getId(), docFile);
                        }
                    }
                }
            }

            // Sort files by order and then by title
            groupFiles.sort(Comparator.comparingInt(DocumentationFile::getOrder)
                    .thenComparing(DocumentationFile::getTitle));

        } catch (IOException e) {
            log.error("Error scanning group files for group {}", groupConfig.getId(), e);
        }

        return groupFiles;
    }

    /**
     * Loads a documentation file from a resource.
     */
    private DocumentationFile loadDocumentationFile(Resource resource, String relativePath, String groupId) {
        try {
            // Read the file content
            String content;
            try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
                content = FileCopyUtils.copyToString(reader);
            }

            // Extract title from the first heading or use the filename
            String title = extractTitle(content, relativePath);

            // Create the documentation file
            DocumentationFile docFile = new DocumentationFile();
            docFile.setId(UUID.randomUUID().toString());
            docFile.setTitle(title);
            docFile.setPath(relativePath);
            docFile.setRawContent(content); // Use the new method to set base64-encoded content
            docFile.setGroupId(groupId);
            docFile.setOrder(0); // Default order
            docFile.setLastModified(LocalDateTime.now());
            docFile.setExtension(getFileExtension(relativePath));

            // Parse business flow tags
            businessFlowTagParser.parseBusinessFlowTags(docFile);

            return docFile;
        } catch (IOException e) {
            log.error("Error loading documentation file: {}", relativePath, e);
            return null;
        }
    }

    /**
     * Extracts the title from the content or filename.
     */
    private String extractTitle(String content, String path) {
        // Try to extract the first heading
        String[] lines = content.split("\\r?\\n");
        for (String line : lines) {
            if (line.startsWith("# ")) {
                return line.substring(2).trim();
            }
        }

        // Fall back to the filename without extension
        Path filePath = Paths.get(path);
        String filename = filePath.getFileName().toString();
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            filename = filename.substring(0, dotIndex);
        }

        // Convert kebab-case or snake_case to title case
        return Arrays.stream(filename.split("[-_]"))
                .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1))
                .collect(Collectors.joining(" "));
    }

    /**
     * Extracts the relative path from a resource URI.
     */
    private String extractRelativePath(String resourcePath, String basePath) {
        // Remove the base path prefix
        String normalizedBasePath = basePath;
        if (normalizedBasePath.startsWith("classpath:")) {
            normalizedBasePath = normalizedBasePath.substring("classpath:".length());
        }

        int index = resourcePath.indexOf(normalizedBasePath);
        if (index >= 0) {
            return resourcePath.substring(index + normalizedBasePath.length());
        }

        // Fall back to just the filename
        return Paths.get(resourcePath).getFileName().toString();
    }

    /**
     * Gets the file extension from a path.
     */
    private String getFileExtension(String path) {
        int dotIndex = path.lastIndexOf('.');
        if (dotIndex > 0) {
            return path.substring(dotIndex + 1);
        }
        return "";
    }

    /**
     * Finds a file by its path in a list of files.
     */
    private DocumentationFile findFileByPath(List<DocumentationFile> files, String path) {
        return files.stream()
                .filter(file -> file.getPath().equals(path))
                .findFirst()
                .orElse(null);
    }

    /**
     * Gets all documentation groups.
     */
    public List<DocumentationGroup> getAllGroups() {
        return documentationGroups.values().stream()
                .sorted(Comparator.comparingInt(DocumentationGroup::getOrder))
                .collect(Collectors.toList());
    }

    /**
     * Gets a documentation group by ID.
     */
    public DocumentationGroup getGroup(String groupId) {
        return documentationGroups.get(groupId);
    }

    /**
     * Gets a documentation file by ID.
     */
    public DocumentationFile getFile(String fileId) {
        return documentationFiles.get(fileId);
    }

    /**
     * Gets the documentation configuration.
     */
    public DocumentationConfig getDocumentationConfig() {
        return documentationConfig;
    }

    /**
     * Refreshes the documentation by rescanning.
     */
    public void refresh() {
        log.info("Refreshing documentation...");
        scanDocumentation();
    }
}
