package io.github.rohitect.kraven.plugins.mockserver.event;

/**
 * Enum for Mock Server event types.
 */
public enum MockServerEventType {
    SERVER_STARTED,
    SERVER_STOPPED,
    CONFIGURATION_LOADED,
    CONFIGURATION_RELOADED,
    RESPONSE_CHANGED,
    REQUEST_RECEIVED,
    RESPONSE_SENT,
    TEMPLATE_TESTED,
    MATCHER_TESTED
}
