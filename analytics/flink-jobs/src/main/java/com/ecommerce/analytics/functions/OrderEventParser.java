package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.OrderEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.functions.MapFunction;

import java.time.Instant;

/**
 * Parses JSON string to OrderEvent object
 */
public class OrderEventParser implements MapFunction<String, OrderEvent> {
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public OrderEvent map(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            
            OrderEvent event = new OrderEvent();
            event.setOrderId(node.get("order_id").asLong());
            event.setUserId(node.get("user_id").asLong());
            event.setTotalAmount(node.get("total_amount").asDouble());
            
            // Optional field
            if (node.has("items_count")) {
                event.setItemsCount(node.get("items_count").asInt());
            } else {
                event.setItemsCount(1);
            }
            
            // Parse timestamp
            String timestampStr = node.get("timestamp").asText();
            event.setTimestamp(Instant.parse(timestampStr));
            
            return event;
            
        } catch (Exception e) {
            System.err.println("Failed to parse order event: " + e.getMessage());
            return null;
        }
    }
}