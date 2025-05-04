package io.github.rohitect.kraven.plugins.mockserver.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.regex.Pattern;

/**
 * Configuration for a request matcher.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MockMatcher {

    /**
     * The type of matcher.
     * Possible values: "header", "query-param", "path-variable", "body"
     */
    private String type;

    /**
     * The name of the parameter to match.
     * For headers, this is the header name.
     * For query parameters, this is the parameter name.
     * For path variables, this is the variable name.
     * For body, this is the JSON path expression.
     */
    private String name;

    /**
     * The value to match against.
     */
    private String value;

    /**
     * The pattern to match against (supports regex).
     */
    private String pattern;

    /**
     * The operator to use for matching.
     * Possible values: "equals", "contains", "startsWith", "endsWith", "regex", "exists"
     * Default is "equals".
     */
    private String operator = "equals";

    /**
     * Whether the match is case-sensitive.
     * Default is true.
     */
    private boolean caseSensitive = true;

    /**
     * Whether this matcher is required for the endpoint to match.
     * Default is true.
     */
    private boolean required = true;

    /**
     * Check if the given value matches this matcher.
     *
     * @param valueToMatch the value to check
     * @return true if the value matches, false otherwise
     */
    public boolean matches(String valueToMatch) {
        if (valueToMatch == null) {
            // If the value to match is null, it only matches if we're checking for existence
            return "exists".equals(operator) && !required;
        }

        String matchValue = value;
        String matchPattern = pattern;

        // If case-insensitive, convert both to lowercase
        if (!caseSensitive) {
            valueToMatch = valueToMatch.toLowerCase();
            if (matchValue != null) {
                matchValue = matchValue.toLowerCase();
            }
            if (matchPattern != null) {
                matchPattern = matchPattern.toLowerCase();
            }
        }

        // Check based on operator
        switch (operator) {
            case "equals":
                return matchValue != null && matchValue.equals(valueToMatch);
            case "contains":
                return matchValue != null && valueToMatch.contains(matchValue);
            case "startsWith":
                return matchValue != null && valueToMatch.startsWith(matchValue);
            case "endsWith":
                return matchValue != null && valueToMatch.endsWith(matchValue);
            case "regex":
                return matchPattern != null && Pattern.compile(matchPattern).matcher(valueToMatch).matches();
            case "exists":
                return true; // If we got here, the value exists
            default:
                return false;
        }
    }
}
