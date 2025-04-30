package io.github.rohitect.kraven.springboot.metrics.service;

import io.github.rohitect.kraven.springboot.cache.KravenUiCacheService;
import io.github.rohitect.kraven.springboot.feign.FeignClientMetadata;
import io.github.rohitect.kraven.springboot.feign.FeignClientScanner;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaAdminService;
import io.github.rohitect.kraven.springboot.kafka.service.KafkaListenerScanner;
import io.github.rohitect.kraven.springboot.metrics.model.ApplicationMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

import java.lang.annotation.Annotation;
import java.lang.management.ClassLoadingMXBean;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryPoolMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.ThreadMXBean;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Service for collecting application metrics.
 */
@Service
@Slf4j
@ConditionalOnClass(name = "org.springframework.boot.actuate.autoconfigure.endpoint.EndpointAutoConfiguration")
public class ApplicationMetricsService {

    private final ApplicationContext applicationContext;
    private final Environment environment;
    private final Instant startTime = Instant.now();

    @Value("${spring.application.name:Application}")
    private String applicationName;

    @Value("${build.version:unknown}")
    private String buildVersion;

    @Value("${build.time:unknown}")
    private String buildTime;

    private FeignClientScanner feignClientScanner;
    private KafkaAdminService kafkaAdminService;
    private KafkaListenerScanner kafkaListenerScanner;
    private KravenUiCacheService cacheService;
    // Cache for static metrics
    private ApplicationMetrics.SpringMetrics cachedSpringMetrics;

    @Autowired
    public ApplicationMetricsService(
            ApplicationContext applicationContext,
            Environment environment,
            @org.springframework.beans.factory.annotation.Autowired(required = false) KravenUiCacheService cacheService) {
        this.applicationContext = applicationContext;
        this.environment = environment;
        this.cacheService = cacheService;

        if (this.cacheService == null) {
            log.warn("KravenUiCacheService not found, creating a default instance");
            this.cacheService = new KravenUiCacheService(true);
        }

        log.info("ApplicationMetricsService initialized");
    }

    @Autowired(required = false)
    public void setFeignClientScanner(FeignClientScanner feignClientScanner) {
        this.feignClientScanner = feignClientScanner;
    }

    @Autowired(required = false)
    public void setKafkaAdminService(KafkaAdminService kafkaAdminService) {
        this.kafkaAdminService = kafkaAdminService;
    }

    @Autowired(required = false)
    public void setKafkaListenerScanner(KafkaListenerScanner kafkaListenerScanner) {
        this.kafkaListenerScanner = kafkaListenerScanner;
    }



    /**
     * Gets all application metrics.
     *
     * @return the application metrics
     */
    public ApplicationMetrics getApplicationMetrics() {
        return ApplicationMetrics.builder()
                .jvm(getJvmMetrics())
                .application(getAppMetrics())
                .spring(getSpringMetrics())
                .kafka(getKafkaMetrics())
                .feign(getFeignMetrics())
                .build();
    }

    /**
     * Gets JVM metrics.
     *
     * @return the JVM metrics
     */
    public ApplicationMetrics.JvmMetrics getJvmMetrics() {
        return cacheService.getOrCompute("jvmMetrics", () -> {
            log.debug("Computing JVM metrics");
            Runtime runtime = Runtime.getRuntime();
            ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
            ClassLoadingMXBean classLoadingMXBean = ManagementFactory.getClassLoadingMXBean();
            MemoryMXBean memoryMXBean = ManagementFactory.getMemoryMXBean();

            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long maxMemory = runtime.maxMemory();
            long usedMemory = totalMemory - freeMemory;

            // Get detailed memory metrics
            ApplicationMetrics.MemoryDetails memoryDetails = getMemoryDetails(memoryMXBean);

            // Get garbage collector metrics
            ApplicationMetrics.GarbageCollectorMetrics gcMetrics = getGarbageCollectorMetrics();

            Map<String, String> systemProperties = new HashMap<>();
            systemProperties.put("java.version", System.getProperty("java.version"));
            systemProperties.put("java.vendor", System.getProperty("java.vendor"));
            systemProperties.put("os.name", System.getProperty("os.name"));
            systemProperties.put("os.arch", System.getProperty("os.arch"));
            systemProperties.put("os.version", System.getProperty("os.version"));
            systemProperties.put("user.name", System.getProperty("user.name"));
            systemProperties.put("user.timezone", System.getProperty("user.timezone"));

            return ApplicationMetrics.JvmMetrics.builder()
                    .totalMemory(totalMemory)
                    .freeMemory(freeMemory)
                    .maxMemory(maxMemory)
                    .usedMemory(usedMemory)
                    .memoryDetails(memoryDetails)
                    .availableProcessors(runtime.availableProcessors())
                    .threadCount(threadMXBean.getThreadCount())
                    .peakThreadCount(threadMXBean.getPeakThreadCount())
                    .daemonThreadCount(threadMXBean.getDaemonThreadCount())
                    .totalStartedThreadCount(threadMXBean.getTotalStartedThreadCount())
                    .uptime(ManagementFactory.getRuntimeMXBean().getUptime())
                    .loadedClassCount(classLoadingMXBean.getLoadedClassCount())
                    .totalLoadedClassCount(classLoadingMXBean.getTotalLoadedClassCount())
                    .unloadedClassCount(classLoadingMXBean.getUnloadedClassCount())
                    .systemProperties(systemProperties)
                    .garbageCollector(gcMetrics)
                    .build();
        });
    }

    /**
     * Gets detailed memory metrics.
     *
     * @param memoryMXBean the memory MX bean
     * @return the memory details
     */
    private ApplicationMetrics.MemoryDetails getMemoryDetails(MemoryMXBean memoryMXBean) {
        // Get heap and non-heap memory usage
        MemoryUsage heapMemoryUsage = memoryMXBean.getHeapMemoryUsage();
        MemoryUsage nonHeapMemoryUsage = memoryMXBean.getNonHeapMemoryUsage();

        // Create memory pool metrics
        ApplicationMetrics.MemoryPoolMetrics heapMetrics = createMemoryPoolMetrics("Heap", heapMemoryUsage);
        ApplicationMetrics.MemoryPoolMetrics nonHeapMetrics = createMemoryPoolMetrics("Non-Heap", nonHeapMemoryUsage);

        // Get detailed memory pool metrics
        Map<String, ApplicationMetrics.MemoryPoolMetrics> memoryPools = new HashMap<>();
        for (MemoryPoolMXBean memoryPoolMXBean : ManagementFactory.getMemoryPoolMXBeans()) {
            String name = memoryPoolMXBean.getName();
            MemoryUsage usage = memoryPoolMXBean.getUsage();
            memoryPools.put(name, createMemoryPoolMetrics(name, usage));
        }

        return ApplicationMetrics.MemoryDetails.builder()
                .heap(heapMetrics)
                .nonHeap(nonHeapMetrics)
                .memoryPools(memoryPools)
                .build();
    }

    /**
     * Creates memory pool metrics from memory usage.
     *
     * @param name the name of the memory pool
     * @param usage the memory usage
     * @return the memory pool metrics
     */
    private ApplicationMetrics.MemoryPoolMetrics createMemoryPoolMetrics(String name, MemoryUsage usage) {
        long init = usage.getInit();
        long used = usage.getUsed();
        long committed = usage.getCommitted();
        long max = usage.getMax();
        double usagePercentage = max > 0 ? ((double) used / max) * 100 : 0;

        return ApplicationMetrics.MemoryPoolMetrics.builder()
                .name(name)
                .init(init)
                .used(used)
                .committed(committed)
                .max(max)
                .usagePercentage(usagePercentage)
                .build();
    }

    /**
     * Gets garbage collector metrics.
     *
     * @return the garbage collector metrics
     */
    private ApplicationMetrics.GarbageCollectorMetrics getGarbageCollectorMetrics() {
        Map<String, ApplicationMetrics.GarbageCollectorInfo> collectors = new HashMap<>();

        for (GarbageCollectorMXBean gcBean : ManagementFactory.getGarbageCollectorMXBeans()) {
            String name = gcBean.getName();
            long collectionCount = gcBean.getCollectionCount();
            long collectionTime = gcBean.getCollectionTime();

            collectors.put(name, ApplicationMetrics.GarbageCollectorInfo.builder()
                    .name(name)
                    .collectionCount(collectionCount)
                    .collectionTime(collectionTime)
                    .build());
        }

        return ApplicationMetrics.GarbageCollectorMetrics.builder()
                .collectors(collectors)
                .build();
    }

    /**
     * Gets application metrics.
     *
     * @return the application metrics
     */
    public ApplicationMetrics.AppMetrics getAppMetrics() {
        return cacheService.getOrCompute("appMetrics", () -> {
            log.debug("Computing application metrics");
            String[] activeProfiles = environment.getActiveProfiles();
            if (activeProfiles.length == 0) {
                activeProfiles = environment.getDefaultProfiles();
            }

            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            String formattedStartTime = dateFormat.format(Date.from(startTime));
            long uptime = Duration.between(startTime, Instant.now()).toMillis();

            return ApplicationMetrics.AppMetrics.builder()
                    .name(applicationName)
                    .version(buildVersion)
                    .buildTime(buildTime)
                    .startTime(formattedStartTime)
                    .uptime(uptime)
                    .profiles(activeProfiles)
                    .build();
        });
    }

    /**
     * Gets Spring metrics.
     *
     * @return the Spring metrics
     */
    public ApplicationMetrics.SpringMetrics getSpringMetrics() {
        return cacheService.getOrCompute("springMetrics", () -> {
            log.debug("Computing Spring metrics");
            // Return cached metrics if available
            if (cachedSpringMetrics != null) {
                return cachedSpringMetrics;
            }

            String[] beanNames = applicationContext.getBeanDefinitionNames();
            int beanCount = beanNames.length;

            int controllerCount = countBeansWithAnnotation(RestController.class) + countBeansWithAnnotation(Controller.class);
            int serviceCount = countBeansWithAnnotation(Service.class);
            int repositoryCount = countBeansWithAnnotation(Repository.class);
            int componentCount = countBeansWithAnnotation(Component.class);
            int configurationCount = countBeansWithAnnotation(org.springframework.context.annotation.Configuration.class);
            int endpointCount = countEndpoints();

            // Build and cache the metrics
            cachedSpringMetrics = ApplicationMetrics.SpringMetrics.builder()
                    .beanCount(beanCount)
                    .controllerCount(controllerCount)
                    .serviceCount(serviceCount)
                    .repositoryCount(repositoryCount)
                    .componentCount(componentCount)
                    .configurationCount(configurationCount)
                    .endpointCount(endpointCount)
                    .build();

            return cachedSpringMetrics;
        });
    }

    /**
     * Gets Kafka metrics.
     *
     * @return the Kafka metrics
     */
    public ApplicationMetrics.KafkaMetrics getKafkaMetrics() {
        int topicCount = 0;
        int consumerCount = 0;
        int producerCount = 0;
        int listenerCount = 0;

        try {
            if (kafkaAdminService != null) {
                var clusterInfo = kafkaAdminService.getClusterInfo();
                if (clusterInfo != null) {
                    topicCount = clusterInfo.getTopics() != null ? clusterInfo.getTopics().size() : 0;
                    consumerCount = clusterInfo.getConsumerGroups() != null ? clusterInfo.getConsumerGroups().size() : 0;
                }
            }

            if (kafkaListenerScanner != null) {
                var listeners = kafkaListenerScanner.getKafkaListeners();
                listenerCount = listeners != null ? listeners.size() : 0;
            }

            // Count Kafka producer beans
            producerCount = applicationContext.getBeansOfType(org.springframework.kafka.core.KafkaTemplate.class).size();
        } catch (Exception e) {
            log.warn("Error getting Kafka metrics", e);
        }

        return ApplicationMetrics.KafkaMetrics.builder()
                .topicCount(topicCount)
                .consumerCount(consumerCount)
                .producerCount(producerCount)
                .listenerCount(listenerCount)
                .build();
    }

    /**
     * Gets Feign metrics.
     *
     * @return the Feign metrics
     */
    public ApplicationMetrics.FeignMetrics getFeignMetrics() {
        int clientCount = 0;
        int methodCount = 0;

        try {
            if (feignClientScanner != null) {
                List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
                clientCount = feignClients.size();
                methodCount = feignClients.stream()
                        .mapToInt(client -> client.getMethods().size())
                        .sum();
            }
        } catch (Exception e) {
            log.warn("Error getting Feign metrics", e);
        }

        return ApplicationMetrics.FeignMetrics.builder()
                .clientCount(clientCount)
                .methodCount(methodCount)
                .build();
    }

    /**
     * Generates a thread dump.
     *
     * @return the thread dump as a string
     */
    public String generateThreadDump() {
        // Use manual thread dump generation
        log.info("Generating thread dump");
        StringBuilder threadDump = new StringBuilder();

        threadDump.append("Thread Dump: ").append(new Date()).append("\n\n");

        for (Thread thread : Thread.getAllStackTraces().keySet()) {
            threadDump.append("\"").append(thread.getName()).append("\"")
                    .append(" Id=").append(thread.getId())
                    .append(" ").append(thread.getState())
                    .append("\n");

            StackTraceElement[] stackTrace = thread.getStackTrace();
            for (StackTraceElement element : stackTrace) {
                threadDump.append("\tat ").append(element).append("\n");
            }
            threadDump.append("\n");
        }

        return threadDump.toString();
    }

    /**
     * Counts beans with a specific annotation.
     *
     * @param annotation the annotation class
     * @return the count of beans with the annotation
     */
    private int countBeansWithAnnotation(Class<?> annotationClass) {
        if (annotationClass == null) {
            return 0;
        }

        try {
            @SuppressWarnings("unchecked")
            Class<? extends Annotation> annotation = (Class<? extends Annotation>) annotationClass;
            Map<String, Object> beans = applicationContext.getBeansWithAnnotation(annotation);
            return beans.size();
        } catch (ClassCastException e) {
            log.warn("Class {} is not an annotation", annotationClass.getName());
            return 0;
        }
    }

    /**
     * Counts REST endpoints in the application.
     *
     * @return the count of REST endpoints
     */
    private int countEndpoints() {
        int count = 0;
        Map<String, Object> controllers = applicationContext.getBeansWithAnnotation(RestController.class);
        controllers.putAll(applicationContext.getBeansWithAnnotation(Controller.class));

        for (Object controller : controllers.values()) {
            Class<?> controllerClass = controller.getClass();
            // Handle proxied classes
            if (controllerClass.getName().contains("$$")) {
                controllerClass = controllerClass.getSuperclass();
            }

            // Count methods with request mapping annotations
            count += Arrays.stream(controllerClass.getMethods())
                    .filter(method -> method.isAnnotationPresent(org.springframework.web.bind.annotation.RequestMapping.class) ||
                            method.isAnnotationPresent(org.springframework.web.bind.annotation.GetMapping.class) ||
                            method.isAnnotationPresent(org.springframework.web.bind.annotation.PostMapping.class) ||
                            method.isAnnotationPresent(org.springframework.web.bind.annotation.PutMapping.class) ||
                            method.isAnnotationPresent(org.springframework.web.bind.annotation.DeleteMapping.class) ||
                            method.isAnnotationPresent(org.springframework.web.bind.annotation.PatchMapping.class))
                    .count();
        }

        return count;
    }
}
