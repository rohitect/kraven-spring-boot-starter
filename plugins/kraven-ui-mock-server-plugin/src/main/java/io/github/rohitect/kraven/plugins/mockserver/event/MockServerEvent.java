package io.github.rohitect.kraven.plugins.mockserver.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.Map;

/**
 * Event class for Mock Server plugin events.
 */
@Getter
public class MockServerEvent extends ApplicationEvent {

    private final MockServerEventType eventType;
    private final Map<String, Object> data;
    private final long eventTime;

    /**
     * Create a new MockServerEvent.
     *
     * @param source the source of the event
     * @param eventType the type of event
     * @param data additional event data
     */
    public MockServerEvent(Object source, MockServerEventType eventType, Map<String, Object> data) {
        super(source);
        this.eventType = eventType;
        this.data = data;
        this.eventTime = System.currentTimeMillis();
    }
}
