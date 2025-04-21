package io.github.rohitect.kraven.springboot.feign;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Executor for Feign client methods.
 */
@Component
public class FeignClientExecutor {

    private final ApplicationContext applicationContext;
    private final FeignClientScanner feignClientScanner;

    @Autowired
    public FeignClientExecutor(ApplicationContext applicationContext, FeignClientScanner feignClientScanner) {
        this.applicationContext = applicationContext;
        this.feignClientScanner = feignClientScanner;
    }

    /**
     * Executes a Feign client method.
     *
     * @param clientName  the name of the Feign client
     * @param methodName  the name of the method
     * @param parameters  the parameters for the method
     * @return the result of the method execution
     * @throws Exception if the method execution fails
     */
    public Object executeMethod(String clientName, String methodName, Map<String, Object> parameters) throws Exception {
        // Find the Feign client metadata
        List<FeignClientMetadata> feignClients = feignClientScanner.scanFeignClients();
        Optional<FeignClientMetadata> feignClientOpt = feignClients.stream()
                .filter(client -> client.getName().equals(clientName))
                .findFirst();

        if (feignClientOpt.isEmpty()) {
            throw new IllegalArgumentException("Feign client not found: " + clientName);
        }

        FeignClientMetadata feignClient = feignClientOpt.get();

        // Find the method metadata
        Optional<FeignMethodMetadata> methodMetadataOpt = feignClient.getMethods().stream()
                .filter(method -> method.getName().equals(methodName))
                .findFirst();

        if (methodMetadataOpt.isEmpty()) {
            throw new IllegalArgumentException("Method not found: " + methodName);
        }

        FeignMethodMetadata methodMetadata = methodMetadataOpt.get();

        // Find the Feign client bean
        String className = feignClient.getClassName();
        Class<?> feignClientClass = Class.forName(className);
        Object feignClientBean = applicationContext.getBean(feignClientClass);

        // Find the method
        Method[] methods = feignClientClass.getDeclaredMethods();
        Optional<Method> methodOpt = Arrays.stream(methods)
                .filter(m -> m.getName().equals(methodName))
                .findFirst();

        if (methodOpt.isEmpty()) {
            throw new IllegalArgumentException("Method not found: " + methodName);
        }

        Method method = methodOpt.get();

        // Prepare parameters
        Object[] paramValues = new Object[methodMetadata.getParameters().size()];
        for (int i = 0; i < methodMetadata.getParameters().size(); i++) {
            FeignParameterMetadata paramMetadata = methodMetadata.getParameters().get(i);
            String paramName = paramMetadata.getName();

            if (parameters.containsKey(paramName)) {
                paramValues[i] = parameters.get(paramName);
            } else if (paramMetadata.isRequired()) {
                throw new IllegalArgumentException("Required parameter missing: " + paramName);
            } else {
                paramValues[i] = null;
            }
        }

        // Execute the method
        return method.invoke(feignClientBean, paramValues);
    }
}
