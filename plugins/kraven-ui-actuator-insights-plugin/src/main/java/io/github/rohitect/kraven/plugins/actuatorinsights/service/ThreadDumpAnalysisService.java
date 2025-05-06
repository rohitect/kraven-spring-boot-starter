package io.github.rohitect.kraven.plugins.actuatorinsights.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for analyzing thread dumps.
 */
@Service
@Slf4j
public class ThreadDumpAnalysisService {

    /**
     * Analyze thread dump data based on the specified analysis type.
     *
     * @param threadDumpData the thread dump data to analyze
     * @param analysisType the type of analysis to perform
     * @return the analysis results
     */
    public Map<String, Object> analyzeThreadDump(Map<String, Object> threadDumpData, String analysisType) {
        if (threadDumpData == null || !threadDumpData.containsKey("threads")) {
            log.warn("Thread dump data is null or does not contain threads");
            return createErrorResponse("Invalid thread dump data");
        }

        try {
            List<Map<String, Object>> threads = (List<Map<String, Object>>) threadDumpData.get("threads");

            switch (analysisType) {
                case "state-distribution":
                    return analyzeThreadStateDistribution(threads);
                case "deadlock-detection":
                    return analyzeDeadlocks(threads, threadDumpData);
                case "lock-contention":
                    return analyzeLockContention(threads);
                case "thread-pool":
                    return analyzeThreadPools(threads);
                case "stack-trace-patterns":
                    return analyzeStackTracePatterns(threads);
                case "thread-groups":
                    return analyzeThreadGroups(threads);
                case "cpu-intensive":
                    return analyzeCpuIntensiveThreads(threads);
                case "memory-leak":
                    return analyzeMemoryLeakIndicators(threads);
                case "comprehensive":
                    return performComprehensiveAnalysis(threads, threadDumpData);
                default:
                    return createErrorResponse("Unknown analysis type: " + analysisType);
            }
        } catch (Exception e) {
            log.error("Error analyzing thread dump", e);
            return createErrorResponse("Error analyzing thread dump: " + e.getMessage());
        }
    }

    /**
     * Analyze thread state distribution.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeThreadStateDistribution(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Integer> stateCounts = new HashMap<>();

        // Count threads by state
        for (Map<String, Object> thread : threads) {
            String state = (String) thread.get("threadState");
            stateCounts.put(state, stateCounts.getOrDefault(state, 0) + 1);
        }

        // Calculate percentages
        Map<String, Double> statePercentages = new HashMap<>();
        int totalThreads = threads.size();

        for (Map.Entry<String, Integer> entry : stateCounts.entrySet()) {
            double percentage = (double) entry.getValue() / totalThreads * 100;
            statePercentages.put(entry.getKey(), Math.round(percentage * 100) / 100.0); // Round to 2 decimal places
        }

        result.put("title", "Thread State Distribution Analysis");
        result.put("description", "Analysis of thread states distribution across " + totalThreads + " threads");
        result.put("totalThreads", totalThreads);
        result.put("stateCounts", stateCounts);
        result.put("statePercentages", statePercentages);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze deadlocks in the thread dump.
     *
     * @param threads the threads to analyze
     * @param threadDumpData the complete thread dump data
     * @return the analysis results
     */
    private Map<String, Object> analyzeDeadlocks(List<Map<String, Object>> threads, Map<String, Object> threadDumpData) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> deadlockDetails = new ArrayList<>();

        // Check if deadlocks are already detected in the thread dump
        if (threadDumpData.containsKey("deadlockedThreads")) {
            List<Long> deadlockedThreadIds = (List<Long>) threadDumpData.get("deadlockedThreads");

            if (deadlockedThreadIds != null && !deadlockedThreadIds.isEmpty()) {
                // Find the deadlocked threads
                Map<Long, Map<String, Object>> threadById = threads.stream()
                    .collect(Collectors.toMap(
                        thread -> (Long) thread.get("threadId"),
                        thread -> thread
                    ));

                for (Long threadId : deadlockedThreadIds) {
                    Map<String, Object> thread = threadById.get(threadId);
                    if (thread != null) {
                        Map<String, Object> deadlockInfo = new HashMap<>();
                        deadlockInfo.put("threadId", threadId);
                        deadlockInfo.put("threadName", thread.get("threadName"));
                        deadlockInfo.put("threadState", thread.get("threadState"));

                        // Add lock information if available
                        if (thread.containsKey("lockName")) {
                            deadlockInfo.put("lockName", thread.get("lockName"));
                        }

                        if (thread.containsKey("lockOwnerId") && (Long) thread.get("lockOwnerId") >= 0) {
                            deadlockInfo.put("lockOwnerId", thread.get("lockOwnerId"));
                            deadlockInfo.put("lockOwnerName", thread.get("lockOwnerName"));
                        }

                        deadlockDetails.add(deadlockInfo);
                    }
                }

                result.put("deadlocksDetected", true);
                result.put("deadlockCount", deadlockedThreadIds.size());
                result.put("deadlockDetails", deadlockDetails);
            } else {
                result.put("deadlocksDetected", false);
            }
        } else {
            // Perform manual deadlock detection
            // This is a simplified implementation - a real one would be more complex
            Map<Long, Set<Long>> waitForGraph = new HashMap<>();

            for (Map<String, Object> thread : threads) {
                if ("BLOCKED".equals(thread.get("threadState"))) {
                    // Handle threadId which could be Integer or Long
                    Object threadIdObj = thread.get("threadId");
                    Long threadId;
                    if (threadIdObj instanceof Integer) {
                        threadId = ((Integer) threadIdObj).longValue();
                    } else if (threadIdObj instanceof Long) {
                        threadId = (Long) threadIdObj;
                    } else {
                        try {
                            threadId = Long.parseLong(threadIdObj.toString());
                        } catch (NumberFormatException e) {
                            // Skip this thread if we can't parse the ID
                            continue;
                        }
                    }

                    // Handle lockOwnerId which could be Integer or Long
                    Object lockOwnerIdObj = thread.getOrDefault("lockOwnerId", -1L);
                    Long lockOwnerId;
                    if (lockOwnerIdObj instanceof Integer) {
                        lockOwnerId = ((Integer) lockOwnerIdObj).longValue();
                    } else if (lockOwnerIdObj instanceof Long) {
                        lockOwnerId = (Long) lockOwnerIdObj;
                    } else {
                        try {
                            lockOwnerId = Long.parseLong(lockOwnerIdObj.toString());
                        } catch (NumberFormatException e) {
                            // Use -1 as default if we can't parse the ID
                            lockOwnerId = -1L;
                        }
                    }

                    if (lockOwnerId >= 0) {
                        waitForGraph.computeIfAbsent(threadId, k -> new HashSet<>()).add(lockOwnerId);
                    }
                }
            }

            // Detect cycles in the wait-for graph (simplified)
            Set<Long> deadlockedThreads = new HashSet<>();
            for (Long threadId : waitForGraph.keySet()) {
                Set<Long> visited = new HashSet<>();
                visited.add(threadId);

                Long current = threadId;
                while (true) {
                    Set<Long> waitingFor = waitForGraph.get(current);
                    if (waitingFor == null || waitingFor.isEmpty()) {
                        break; // No deadlock through this path
                    }

                    Long next = waitingFor.iterator().next(); // Take the first one for simplicity

                    if (visited.contains(next)) {
                        // Deadlock detected!
                        deadlockedThreads.add(threadId);
                        break;
                    }

                    visited.add(next);
                    current = next;

                    if (!waitForGraph.containsKey(current)) {
                        break; // End of path
                    }
                }
            }

            if (!deadlockedThreads.isEmpty()) {
                // Find details for deadlocked threads
                Map<Long, Map<String, Object>> threadById = new HashMap<>();

                // Safely convert threadId to Long for each thread
                for (Map<String, Object> thread : threads) {
                    Object threadIdObj = thread.get("threadId");
                    Long threadId;

                    if (threadIdObj instanceof Integer) {
                        threadId = ((Integer) threadIdObj).longValue();
                    } else if (threadIdObj instanceof Long) {
                        threadId = (Long) threadIdObj;
                    } else {
                        try {
                            threadId = Long.parseLong(threadIdObj.toString());
                        } catch (NumberFormatException e) {
                            // Skip this thread if we can't parse the ID
                            continue;
                        }
                    }

                    threadById.put(threadId, thread);
                }

                for (Long threadId : deadlockedThreads) {
                    Map<String, Object> thread = threadById.get(threadId);
                    if (thread != null) {
                        Map<String, Object> deadlockInfo = new HashMap<>();
                        deadlockInfo.put("threadId", threadId);
                        deadlockInfo.put("threadName", thread.get("threadName"));
                        deadlockInfo.put("threadState", thread.get("threadState"));

                        // Add lock information if available
                        if (thread.containsKey("lockName")) {
                            deadlockInfo.put("lockName", thread.get("lockName"));
                        }

                        if (thread.containsKey("lockOwnerId")) {
                            Object lockOwnerIdObj = thread.get("lockOwnerId");
                            long lockOwnerId;

                            // Handle both Integer and Long types
                            if (lockOwnerIdObj instanceof Integer) {
                                lockOwnerId = ((Integer) lockOwnerIdObj).longValue();
                            } else if (lockOwnerIdObj instanceof Long) {
                                lockOwnerId = (Long) lockOwnerIdObj;
                            } else {
                                // If it's neither Integer nor Long, try to parse it as a string
                                try {
                                    lockOwnerId = Long.parseLong(lockOwnerIdObj.toString());
                                } catch (NumberFormatException e) {
                                    // If parsing fails, skip this lock info
                                    continue;
                                }
                            }

                            if (lockOwnerId >= 0) {
                                deadlockInfo.put("lockOwnerId", lockOwnerId);
                                deadlockInfo.put("lockOwnerName", thread.get("lockOwnerName"));
                            }
                        }

                        deadlockDetails.add(deadlockInfo);
                    }
                }

                result.put("deadlocksDetected", true);
                result.put("deadlockCount", deadlockedThreads.size());
                result.put("deadlockDetails", deadlockDetails);
            } else {
                result.put("deadlocksDetected", false);
            }
        }

        result.put("title", "Deadlock Detection Analysis");
        result.put("description", "Analysis of potential deadlocks between threads");
        result.put("success", true);

        return result;
    }

    /**
     * Analyze lock contention in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeLockContention(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> lockContentionMap = new HashMap<>();

        // Group blocked threads by the lock they're waiting for
        for (Map<String, Object> thread : threads) {
            if ("BLOCKED".equals(thread.get("threadState")) && thread.containsKey("lockName")) {
                String lockName = (String) thread.get("lockName");

                if (lockName != null && !lockName.isEmpty()) {
                    Map<String, Object> threadInfo = new HashMap<>();
                    threadInfo.put("threadId", thread.get("threadId"));
                    threadInfo.put("threadName", thread.get("threadName"));

                    if (thread.containsKey("lockOwnerId")) {
                        Object lockOwnerIdObj = thread.get("lockOwnerId");
                        long lockOwnerId;

                        // Handle both Integer and Long types
                        if (lockOwnerIdObj instanceof Integer) {
                            lockOwnerId = ((Integer) lockOwnerIdObj).longValue();
                        } else if (lockOwnerIdObj instanceof Long) {
                            lockOwnerId = (Long) lockOwnerIdObj;
                        } else {
                            // If it's neither Integer nor Long, try to parse it as a string
                            try {
                                lockOwnerId = Long.parseLong(lockOwnerIdObj.toString());
                            } catch (NumberFormatException e) {
                                // If parsing fails, skip this thread
                                continue;
                            }
                        }

                        if (lockOwnerId >= 0) {
                            threadInfo.put("lockOwnerId", lockOwnerId);
                            threadInfo.put("lockOwnerName", thread.get("lockOwnerName"));
                        }
                    }

                    lockContentionMap.computeIfAbsent(lockName, k -> new ArrayList<>()).add(threadInfo);
                }
            }
        }

        // Sort locks by contention count
        List<Map<String, Object>> contentionList = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : lockContentionMap.entrySet()) {
            Map<String, Object> contentionInfo = new HashMap<>();
            contentionInfo.put("lockName", entry.getKey());
            contentionInfo.put("contentionCount", entry.getValue().size());
            contentionInfo.put("blockedThreads", entry.getValue());
            contentionList.add(contentionInfo);
        }

        // Sort by contention count (descending)
        contentionList.sort((a, b) -> Integer.compare(
            (int) b.get("contentionCount"),
            (int) a.get("contentionCount")
        ));

        result.put("title", "Lock Contention Analysis");
        result.put("description", "Analysis of locks causing contention between threads");
        result.put("contentionCount", contentionList.size());
        result.put("contentionDetails", contentionList);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze thread pools in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeThreadPools(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Map<String, Object>> poolsMap = new HashMap<>();

        // Define patterns for common thread pool implementations
        Map<String, Pattern> poolPatterns = new HashMap<>();
        poolPatterns.put("ThreadPoolExecutor", Pattern.compile("pool-\\d+-thread-\\d+"));
        poolPatterns.put("Spring Async", Pattern.compile("task-\\d+"));
        poolPatterns.put("Tomcat", Pattern.compile("http-nio-\\d+.*"));
        poolPatterns.put("Jetty", Pattern.compile("qtp\\d+.*"));
        poolPatterns.put("Quartz", Pattern.compile("QuartzScheduler.*"));
        poolPatterns.put("RMI", Pattern.compile("RMI.*"));

        // Group threads by pool
        for (Map<String, Object> thread : threads) {
            String threadName = (String) thread.get("threadName");
            String poolName = "Other";

            // Check if thread belongs to a known pool
            for (Map.Entry<String, Pattern> entry : poolPatterns.entrySet()) {
                if (entry.getValue().matcher(threadName).matches()) {
                    poolName = entry.getKey();
                    break;
                }
            }

            // Extract pool ID for ThreadPoolExecutor
            if (poolName.equals("ThreadPoolExecutor") && threadName.matches("pool-\\d+-thread-\\d+")) {
                String poolId = threadName.replaceAll("pool-(\\d+)-thread-\\d+", "pool-$1");
                poolName = "ThreadPoolExecutor-" + poolId;
            }

            // Initialize pool info if not exists
            if (!poolsMap.containsKey(poolName)) {
                Map<String, Object> poolInfo = new HashMap<>();
                poolInfo.put("poolName", poolName);
                poolInfo.put("threadCount", 0);
                poolInfo.put("stateDistribution", new HashMap<String, Integer>());
                poolInfo.put("threads", new ArrayList<Map<String, Object>>());
                poolsMap.put(poolName, poolInfo);
            }

            // Update pool info
            Map<String, Object> poolInfo = poolsMap.get(poolName);
            poolInfo.put("threadCount", (int) poolInfo.get("threadCount") + 1);

            // Update state distribution
            Map<String, Integer> stateDistribution = (Map<String, Integer>) poolInfo.get("stateDistribution");
            String state = (String) thread.get("threadState");
            stateDistribution.put(state, stateDistribution.getOrDefault(state, 0) + 1);

            // Add thread info
            Map<String, Object> threadInfo = new HashMap<>();
            threadInfo.put("threadId", thread.get("threadId"));
            threadInfo.put("threadName", threadName);
            threadInfo.put("threadState", state);
            ((List<Map<String, Object>>) poolInfo.get("threads")).add(threadInfo);
        }

        // Convert to list and sort by thread count
        List<Map<String, Object>> poolsList = new ArrayList<>(poolsMap.values());
        poolsList.sort((a, b) -> Integer.compare(
            (int) b.get("threadCount"),
            (int) a.get("threadCount")
        ));

        result.put("title", "Thread Pool Analysis");
        result.put("description", "Analysis of thread pools and their utilization");
        result.put("poolCount", poolsList.size());
        result.put("pools", poolsList);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze stack trace patterns in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeStackTracePatterns(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Integer> methodFrequency = new HashMap<>();

        // Count method occurrences across all stack traces
        for (Map<String, Object> thread : threads) {
            if (thread.containsKey("stackTrace")) {
                List<Map<String, Object>> stackTrace = (List<Map<String, Object>>) thread.get("stackTrace");

                for (Map<String, Object> frame : stackTrace) {
                    String className = (String) frame.get("className");
                    String methodName = (String) frame.get("methodName");
                    String method = className + "." + methodName;

                    methodFrequency.put(method, methodFrequency.getOrDefault(method, 0) + 1);
                }
            }
        }

        // Convert to list and sort by frequency
        List<Map<String, Object>> hotMethods = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : methodFrequency.entrySet()) {
            Map<String, Object> methodInfo = new HashMap<>();
            methodInfo.put("method", entry.getKey());
            methodInfo.put("occurrences", entry.getValue());
            hotMethods.add(methodInfo);
        }

        // Sort by occurrences (descending)
        hotMethods.sort((a, b) -> Integer.compare(
            (int) b.get("occurrences"),
            (int) a.get("occurrences")
        ));

        // Take top 20 methods
        List<Map<String, Object>> topMethods = hotMethods.stream()
            .limit(20)
            .collect(Collectors.toList());

        result.put("title", "Stack Trace Pattern Analysis");
        result.put("description", "Analysis of common patterns in thread stack traces");
        result.put("uniqueMethodsCount", methodFrequency.size());
        result.put("topMethods", topMethods);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze thread groups in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeThreadGroups(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> groupsMap = new HashMap<>();

        // Define patterns for different thread groups
        Map<String, Pattern> groupPatterns = new HashMap<>();
        groupPatterns.put("Web Requests", Pattern.compile("http-nio-\\d+.*|qtp\\d+.*"));
        groupPatterns.put("Database", Pattern.compile(".*(?:JDBC|DB|Hibernate|SQL).*"));
        groupPatterns.put("Background Tasks", Pattern.compile(".*(?:Scheduler|Worker|Async|pool-\\d+).*"));
        groupPatterns.put("JVM Internal", Pattern.compile(".*(?:GC|Finalizer|Reference|Cleaner|Monitor|Signal|Attach).*"));
        groupPatterns.put("RMI", Pattern.compile("RMI.*"));

        // Group threads
        for (Map<String, Object> thread : threads) {
            String threadName = (String) thread.get("threadName");
            String group = "Other";

            // Check if thread belongs to a known group
            for (Map.Entry<String, Pattern> entry : groupPatterns.entrySet()) {
                if (entry.getValue().matcher(threadName).matches()) {
                    group = entry.getKey();
                    break;
                }
            }

            // Add thread to group
            Map<String, Object> threadInfo = new HashMap<>();
            threadInfo.put("threadId", thread.get("threadId"));
            threadInfo.put("threadName", threadName);
            threadInfo.put("threadState", thread.get("threadState"));

            groupsMap.computeIfAbsent(group, k -> new ArrayList<>()).add(threadInfo);
        }

        // Convert to list and add state distribution
        List<Map<String, Object>> groupsList = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : groupsMap.entrySet()) {
            Map<String, Object> groupInfo = new HashMap<>();
            groupInfo.put("groupName", entry.getKey());
            groupInfo.put("threadCount", entry.getValue().size());

            // Calculate state distribution
            Map<String, Integer> stateDistribution = new HashMap<>();
            for (Map<String, Object> thread : entry.getValue()) {
                String state = (String) thread.get("threadState");
                stateDistribution.put(state, stateDistribution.getOrDefault(state, 0) + 1);
            }

            groupInfo.put("stateDistribution", stateDistribution);
            groupInfo.put("threads", entry.getValue());

            groupsList.add(groupInfo);
        }

        // Sort by thread count (descending)
        groupsList.sort((a, b) -> Integer.compare(
            (int) b.get("threadCount"),
            (int) a.get("threadCount")
        ));

        result.put("title", "Thread Grouping Analysis");
        result.put("description", "Analysis of threads grouped by their function or subsystem");
        result.put("groupCount", groupsList.size());
        result.put("groups", groupsList);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze CPU-intensive threads in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeCpuIntensiveThreads(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> cpuIntensiveThreads = new ArrayList<>();

        // Define patterns for I/O operations
        Set<String> ioPatterns = new HashSet<>(Arrays.asList(
            "java.net.Socket",
            "java.io.FileInputStream",
            "java.io.FileOutputStream",
            "java.nio.channels",
            "sun.nio.ch",
            "java.util.concurrent.locks",
            "java.lang.Object.wait",
            "java.lang.Thread.sleep"
        ));

        // Find RUNNABLE threads that are not waiting on I/O
        for (Map<String, Object> thread : threads) {
            if ("RUNNABLE".equals(thread.get("threadState"))) {
                boolean isWaitingOnIO = false;

                if (thread.containsKey("stackTrace")) {
                    List<Map<String, Object>> stackTrace = (List<Map<String, Object>>) thread.get("stackTrace");

                    if (!stackTrace.isEmpty()) {
                        Map<String, Object> topFrame = stackTrace.get(0);
                        String className = (String) topFrame.get("className");

                        // Check if top frame indicates I/O operations
                        for (String pattern : ioPatterns) {
                            if (className.contains(pattern)) {
                                isWaitingOnIO = true;
                                break;
                            }
                        }
                    }
                }

                if (!isWaitingOnIO) {
                    Map<String, Object> threadInfo = new HashMap<>();
                    threadInfo.put("threadId", thread.get("threadId"));
                    threadInfo.put("threadName", thread.get("threadName"));

                    if (thread.containsKey("stackTrace")) {
                        List<Map<String, Object>> stackTrace = (List<Map<String, Object>>) thread.get("stackTrace");
                        if (!stackTrace.isEmpty()) {
                            List<String> topFrames = stackTrace.stream()
                                .limit(5)
                                .map(frame -> {
                                    String className = (String) frame.get("className");
                                    String methodName = (String) frame.get("methodName");
                                    return className + "." + methodName;
                                })
                                .collect(Collectors.toList());

                            threadInfo.put("topFrames", topFrames);
                        }
                    }

                    cpuIntensiveThreads.add(threadInfo);
                }
            }
        }

        result.put("title", "CPU-Intensive Thread Analysis");
        result.put("description", "Analysis of threads that may be consuming CPU resources");
        result.put("cpuIntensiveThreadCount", cpuIntensiveThreads.size());
        result.put("cpuIntensiveThreads", cpuIntensiveThreads);
        result.put("success", true);

        return result;
    }

    /**
     * Analyze memory leak indicators in the thread dump.
     *
     * @param threads the threads to analyze
     * @return the analysis results
     */
    private Map<String, Object> analyzeMemoryLeakIndicators(List<Map<String, Object>> threads) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> leakIndicators = new ArrayList<>();

        // Check for threads with extremely deep stacks
        List<Map<String, Object>> deepStackThreads = new ArrayList<>();
        int deepStackThreshold = 100;

        for (Map<String, Object> thread : threads) {
            if (thread.containsKey("stackTrace")) {
                List<Map<String, Object>> stackTrace = (List<Map<String, Object>>) thread.get("stackTrace");

                if (stackTrace.size() > deepStackThreshold) {
                    Map<String, Object> threadInfo = new HashMap<>();
                    threadInfo.put("threadId", thread.get("threadId"));
                    threadInfo.put("threadName", thread.get("threadName"));
                    threadInfo.put("stackDepth", stackTrace.size());
                    deepStackThreads.add(threadInfo);
                }
            }
        }

        if (!deepStackThreads.isEmpty()) {
            Map<String, Object> indicator = new HashMap<>();
            indicator.put("type", "Deep Stack Traces");
            indicator.put("description", "Threads with unusually deep stack traces (>" + deepStackThreshold + " frames)");
            indicator.put("count", deepStackThreads.size());
            indicator.put("threads", deepStackThreads);
            leakIndicators.add(indicator);
        }

        // Check for excessive thread count
        int highThreadCountThreshold = 200;
        if (threads.size() > highThreadCountThreshold) {
            Map<String, Object> indicator = new HashMap<>();
            indicator.put("type", "High Thread Count");
            indicator.put("description", "The total number of threads (" + threads.size() + ") exceeds the threshold of " + highThreadCountThreshold);
            indicator.put("count", threads.size());
            leakIndicators.add(indicator);
        }

        // Check for thread name patterns that might indicate leaks
        Pattern leakPattern = Pattern.compile(".*(?:Abandoned|Orphaned|Leaked).*");
        List<Map<String, Object>> suspiciousNamedThreads = new ArrayList<>();

        for (Map<String, Object> thread : threads) {
            String threadName = (String) thread.get("threadName");

            if (leakPattern.matcher(threadName).matches()) {
                Map<String, Object> threadInfo = new HashMap<>();
                threadInfo.put("threadId", thread.get("threadId"));
                threadInfo.put("threadName", threadName);
                threadInfo.put("threadState", thread.get("threadState"));
                suspiciousNamedThreads.add(threadInfo);
            }
        }

        if (!suspiciousNamedThreads.isEmpty()) {
            Map<String, Object> indicator = new HashMap<>();
            indicator.put("type", "Suspicious Thread Names");
            indicator.put("description", "Threads with names suggesting they might be leaked or abandoned");
            indicator.put("count", suspiciousNamedThreads.size());
            indicator.put("threads", suspiciousNamedThreads);
            leakIndicators.add(indicator);
        }

        result.put("title", "Memory Leak Indicators Analysis");
        result.put("description", "Analysis of potential indicators of memory leaks related to threads");
        result.put("indicatorCount", leakIndicators.size());
        result.put("indicators", leakIndicators);
        result.put("success", true);

        return result;
    }

    /**
     * Perform a comprehensive analysis of the thread dump.
     *
     * @param threads the threads to analyze
     * @param threadDumpData the complete thread dump data
     * @return the analysis results
     */
    private Map<String, Object> performComprehensiveAnalysis(List<Map<String, Object>> threads, Map<String, Object> threadDumpData) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> analysisResults = new ArrayList<>();

        // Add state distribution analysis
        analysisResults.add(analyzeThreadStateDistribution(threads));

        // Add deadlock analysis
        analysisResults.add(analyzeDeadlocks(threads, threadDumpData));

        // Add lock contention analysis
        analysisResults.add(analyzeLockContention(threads));

        // Add thread pool analysis
        analysisResults.add(analyzeThreadPools(threads));

        // Add stack trace pattern analysis
        analysisResults.add(analyzeStackTracePatterns(threads));

        // Add thread grouping analysis
        analysisResults.add(analyzeThreadGroups(threads));

        // Add CPU-intensive thread analysis
        analysisResults.add(analyzeCpuIntensiveThreads(threads));

        // Add memory leak indicators analysis
        analysisResults.add(analyzeMemoryLeakIndicators(threads));

        result.put("title", "Comprehensive Thread Dump Analysis");
        result.put("description", "Complete analysis of thread dump covering multiple aspects");
        result.put("analysisCount", analysisResults.size());
        result.put("analyses", analysisResults);
        result.put("success", true);

        return result;
    }

    /**
     * Create an error response.
     *
     * @param message the error message
     * @return the error response
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("error", message);
        return result;
    }
}
