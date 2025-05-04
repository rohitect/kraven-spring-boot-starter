package io.github.rohitect.kraven.plugins.mockserver.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Listener for Mock Server events.
 */
@Component
@Slf4j
public class MockServerEventListener {

    /**
     * Handle Mock Server events.
     *
     * @param event the event to handle
     */
    @EventListener
    public void handleMockServerEvent(MockServerEvent event) {
        log.debug("Received Mock Server event: {} with data: {}", event.getEventType(), event.getData());
        
        // Additional event handling logic can be added here
        switch (event.getEventType()) {
            case SERVER_STARTED:
                log.info("Mock Server started");
                break;
            case SERVER_STOPPED:
                log.info("Mock Server stopped");
                break;
            case CONFIGURATION_LOADED:
                log.info("Mock Server configuration loaded");
                break;
            case CONFIGURATION_RELOADED:
                log.info("Mock Server configuration reloaded");
                break;
            case RESPONSE_CHANGED:
                log.debug("Mock Server response changed: {}", event.getData());
                break;
            case REQUEST_RECEIVED:
                log.debug("Mock Server request received: {}", event.getData());
                break;
            case RESPONSE_SENT:
                log.debug("Mock Server response sent: {}", event.getData());
                break;
            case TEMPLATE_TESTED:
                log.debug("Mock Server template tested: {}", event.getData());
                break;
            case MATCHER_TESTED:
                log.debug("Mock Server matcher tested: {}", event.getData());
                break;
        }
    }
}
