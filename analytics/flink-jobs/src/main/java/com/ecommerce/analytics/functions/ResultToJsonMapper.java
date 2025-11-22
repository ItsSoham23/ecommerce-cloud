package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.AnalyticsResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.flink.api.common.functions.MapFunction;

import java.time.Instant;

/**
 * Converts AnalyticsResult to JSON string for Kafka
 */
public class ResultToJsonMapper implements MapFunction<AnalyticsResult, String> {
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public String map(AnalyticsResult result) {
        try {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("metric_type", result.getMetricType());
            node.put("window_start", result.getWindowStart());
            node.put("window_end", result.getWindowEnd());
            node.put("window_start_iso", Instant.ofEpochMilli(result.getWindowStart()).toString());
            node.put("window_end_iso", Instant.ofEpochMilli(result.getWindowEnd()).toString());
            node.put("value", result.getValue());
            node.put("timestamp", result.getTimestamp());
            node.put("timestamp_iso", Instant.ofEpochMilli(result.getTimestamp()).toString());
            
            return objectMapper.writeValueAsString(node);
            
        } catch (Exception e) {
            System.err.println("Failed to convert result to JSON: " + e.getMessage());
            return "{}";
        }
    }
}