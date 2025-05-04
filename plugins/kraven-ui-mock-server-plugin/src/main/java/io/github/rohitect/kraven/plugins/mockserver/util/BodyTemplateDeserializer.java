package io.github.rohitect.kraven.plugins.mockserver.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Custom deserializer for the bodyTemplate field in MockResponse.
 * This deserializer handles both string and object values for the bodyTemplate field.
 * If the value is an object, it will be converted to a JSON string.
 */
public class BodyTemplateDeserializer extends JsonDeserializer<String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        
        if (node.isTextual()) {
            // If it's already a string, return it directly
            return node.asText();
        } else {
            // If it's an object or array, convert it to a JSON string
            return objectMapper.writeValueAsString(node);
        }
    }
}
