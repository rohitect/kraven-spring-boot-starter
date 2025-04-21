package io.github.rohitect.kraven.springboot.feign;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationContext;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the FeignClientExecutor class.
 */
class FeignClientExecutorTest {

    @Mock
    private ApplicationContext applicationContext;

    @Mock
    private FeignClientScanner feignClientScanner;

    private ObjectMapper objectMapper;
    private FeignClientExecutor executor;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        objectMapper = new ObjectMapper();
        executor = new FeignClientExecutor(applicationContext, feignClientScanner, objectMapper);
    }

    @Test
    void testConvertToExpectedType_Primitives() throws Exception {
        // Test primitive conversions using reflection to access private method
        java.lang.reflect.Method method = FeignClientExecutor.class.getDeclaredMethod(
                "convertToExpectedType", Object.class, Class.class);
        method.setAccessible(true);

        // String to Integer
        assertEquals(123, method.invoke(executor, "123", Integer.class));
        
        // String to Long
        assertEquals(123L, method.invoke(executor, "123", Long.class));
        
        // String to Double
        assertEquals(123.45, method.invoke(executor, "123.45", Double.class));
        
        // String to Boolean
        assertEquals(true, method.invoke(executor, "true", Boolean.class));
        assertEquals(false, method.invoke(executor, "false", Boolean.class));
        
        // Number to different number type
        assertEquals(123, method.invoke(executor, 123L, Integer.class));
        assertEquals(123L, method.invoke(executor, 123, Long.class));
        assertEquals(123.0, method.invoke(executor, 123, Double.class));
    }

    @Test
    void testConvertToExpectedType_ComplexObjects() throws Exception {
        // Test complex object conversion using reflection to access private method
        java.lang.reflect.Method method = FeignClientExecutor.class.getDeclaredMethod(
                "convertToExpectedType", Object.class, Class.class);
        method.setAccessible(true);
        
        // Map to TestObject
        Map<String, Object> map = new HashMap<>();
        map.put("name", "Test");
        map.put("value", 123);
        
        TestObject result = (TestObject) method.invoke(executor, map, TestObject.class);
        assertEquals("Test", result.getName());
        assertEquals(123, result.getValue());
    }
    
    // Test class for complex object conversion
    public static class TestObject {
        private String name;
        private int value;
        
        public TestObject() {
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public int getValue() {
            return value;
        }
        
        public void setValue(int value) {
            this.value = value;
        }
    }
}
