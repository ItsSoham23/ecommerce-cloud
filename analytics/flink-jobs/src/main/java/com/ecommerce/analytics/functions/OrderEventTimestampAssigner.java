package com.ecommerce.analytics.functions;

import org.apache.flink.api.common.eventtime.SerializableTimestampAssigner;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;

/**
 * Extracts timestamp from event for event-time processing
 */
public class OrderEventTimestampAssigner implements SerializableTimestampAssigner<String> {
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public long extractTimestamp(String json, long recordTimestamp) {
        try {
            JsonNode node = objectMapper.readTree(json);
            String timestampStr = node.get("timestamp").asText();
            return Instant.parse(timestampStr).toEpochMilli();
        } catch (Exception e) {
            // Fallback to current time if parsing fails
            return System.currentTimeMillis();
        }
    }
}