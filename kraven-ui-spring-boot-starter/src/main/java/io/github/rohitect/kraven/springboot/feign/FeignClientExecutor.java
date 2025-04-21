package io.github.rohitect.kraven.springboot.feign;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Executor for Feign client methods.
 */
@Component
public class FeignClientExecutor {

    private final ApplicationContext applicationContext;
    private final FeignClientScanner feignClientScanner;
    private final ObjectMapper objectMapper;

    @Autowired
    public FeignClientExecutor(ApplicationContext applicationContext, FeignClientScanner feignClientScanner, ObjectMapper objectMapper) {
        this.applicationContext = applicationContext;
        this.feignClientScanner = feignClientScanner;
        this.objectMapper = objectMapper;
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
        // Check if parameters is null and provide an empty map if it is
        Map<String, Object> safeParameters = parameters != null ? parameters : Collections.emptyMap();

        // Check if methodMetadata.getParameters() is null and provide an empty list if it is
        List<FeignParameterMetadata> methodParams = methodMetadata.getParameters() != null ?
                                                   methodMetadata.getParameters() :
                                                   Collections.emptyList();

        Object[] paramValues = new Object[methodParams.size()];
        Class<?>[] parameterTypes = method.getParameterTypes();

        for (int i = 0; i < methodParams.size(); i++) {
            FeignParameterMetadata paramMetadata = methodParams.get(i);
            String paramName = paramMetadata.getName();
            Class<?> expectedType = parameterTypes[i];

            if (safeParameters.containsKey(paramName)) {
                Object paramValue = safeParameters.get(paramName);
                try {
                    // Convert the parameter value to the expected type
                    paramValues[i] = convertToExpectedType(paramValue, expectedType);
                } catch (Exception e) {
                    throw new IllegalArgumentException("Failed to convert parameter '" + paramName +
                        "' from " + (paramValue != null ? paramValue.getClass().getName() : "null") +
                        " to " + expectedType.getName() + ": " + e.getMessage(), e);
                }
            } else if (paramMetadata.isRequired()) {
                throw new IllegalArgumentException("Required parameter missing: " + paramName);
            } else {
                paramValues[i] = null;
            }
        }

        // Execute the method
        try {
            return method.invoke(feignClientBean, paramValues);
        } catch (IllegalArgumentException e) {
            // Provide more detailed error message for argument type mismatch
            StringBuilder errorMsg = new StringBuilder("Argument type mismatch: ");
            errorMsg.append(e.getMessage()).append("\nExpected types: ");
            for (int i = 0; i < parameterTypes.length; i++) {
                errorMsg.append("\n  Parameter ").append(i).append(": ").append(parameterTypes[i].getName());
                errorMsg.append(", Actual: ").append(paramValues[i] != null ? paramValues[i].getClass().getName() : "null");
            }
            throw new IllegalArgumentException(errorMsg.toString(), e);
        }
    }

    /**
     * Converts a value to the expected type.
     *
     * @param value        the value to convert
     * @param expectedType the expected type
     * @return the converted value
     * @throws Exception if conversion fails
     */

    private Object convertToExpectedType(Object value, Class<?> expectedType) throws Exception {
        if (value == null) {
            return null;
        }

        // If the value is already of the expected type, return it
        if (expectedType.isAssignableFrom(value.getClass())) {
            return value;
        }

        // Handle primitive types and their wrappers
        if (expectedType == boolean.class || expectedType == Boolean.class) {
            if (value instanceof String) {
                return Boolean.parseBoolean((String) value);
            } else if (value instanceof Number) {
                return ((Number) value).intValue() != 0;
            }
        } else if (expectedType == byte.class || expectedType == Byte.class) {
            if (value instanceof Number) {
                return ((Number) value).byteValue();
            } else if (value instanceof String) {
                return Byte.parseByte((String) value);
            }
        } else if (expectedType == short.class || expectedType == Short.class) {
            if (value instanceof Number) {
                return ((Number) value).shortValue();
            } else if (value instanceof String) {
                return Short.parseShort((String) value);
            }
        } else if (expectedType == int.class || expectedType == Integer.class) {
            if (value instanceof Number) {
                return ((Number) value).intValue();
            } else if (value instanceof String) {
                return Integer.parseInt((String) value);
            }
        } else if (expectedType == long.class || expectedType == Long.class) {
            if (value instanceof Number) {
                return ((Number) value).longValue();
            } else if (value instanceof String) {
                return Long.parseLong((String) value);
            }
        } else if (expectedType == float.class || expectedType == Float.class) {
            if (value instanceof Number) {
                return ((Number) value).floatValue();
            } else if (value instanceof String) {
                return Float.parseFloat((String) value);
            }
        } else if (expectedType == double.class || expectedType == Double.class) {
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            } else if (value instanceof String) {
                return Double.parseDouble((String) value);
            }
        } else if (expectedType == char.class || expectedType == Character.class) {
            if (value instanceof String) {
                String str = (String) value;
                if (str.length() == 1) {
                    return str.charAt(0);
                }
            }
        } else if (expectedType == String.class) {
            return value.toString();
        } else if (expectedType == BigDecimal.class) {
            if (value instanceof Number) {
                return new BigDecimal(value.toString());
            } else if (value instanceof String) {
                return new BigDecimal((String) value);
            }
        } else if (expectedType == BigInteger.class) {
            if (value instanceof Number) {
                return BigInteger.valueOf(((Number) value).longValue());
            } else if (value instanceof String) {
                return new BigInteger((String) value);
            }
        } else if (expectedType == UUID.class) {
            if (value instanceof String) {
                return UUID.fromString((String) value);
            }
        } else if (expectedType == Date.class) {
            if (value instanceof String) {
                // Try to parse as ISO date
                try {
                    return Date.from(OffsetDateTime.parse((String) value).toInstant());
                } catch (Exception e) {
                    // Try other date formats if needed
                }
            } else if (value instanceof Number) {
                return new Date(((Number) value).longValue());
            }
        } else if (expectedType == LocalDate.class) {
            if (value instanceof String) {
                return LocalDate.parse((String) value);
            }
        } else if (expectedType == LocalDateTime.class) {
            if (value instanceof String) {
                return LocalDateTime.parse((String) value);
            }
        } else if (expectedType == ZonedDateTime.class) {
            if (value instanceof String) {
                return ZonedDateTime.parse((String) value);
            }
        } else if (expectedType == OffsetDateTime.class) {
            if (value instanceof String) {
                return OffsetDateTime.parse((String) value);
            }
        } else if (value instanceof Map) {
            // Convert Map to a complex object using Jackson
            return objectMapper.convertValue(value, expectedType);
        }

        // If we can't convert directly, try using Jackson
        try {
            return objectMapper.convertValue(value, expectedType);
        } catch (Exception e) {
            String valueClassName = (value != null) ? value.getClass().getName() : "null";
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown conversion error";
            throw new IllegalArgumentException("Cannot convert " + valueClassName +
                " to " + expectedType.getName() + ": " + errorMessage, e);
        }
    }
}
