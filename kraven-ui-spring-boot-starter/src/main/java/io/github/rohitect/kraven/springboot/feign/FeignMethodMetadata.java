package io.github.rohitect.kraven.springboot.feign;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Metadata for a Feign client method.
 */
@Data
public class FeignMethodMetadata {
    /**
     * The name of the method.
     */
    private String name;

    /**
     * The HTTP method (GET, POST, PUT, DELETE, etc.).
     */
    private String httpMethod;

    /**
     * The path of the method.
     */
    private String path;

    /**
     * The return type of the method.
     */
    private String returnType;

    /**
     * The parameters of the method.
     */
    private List<FeignParameterMetadata> parameters = new ArrayList<>();

    /**
     * The headers of the method.
     */
    private List<String> headers = new ArrayList<>();

    /**
     * The produces media type of the method.
     */
    private List<String> produces = new ArrayList<>();

    /**
     * The consumes media type of the method.
     */
    private List<String> consumes = new ArrayList<>();
}
