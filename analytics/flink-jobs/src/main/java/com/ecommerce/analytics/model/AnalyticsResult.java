package com.ecommerce.analytics.model;

import java.io.Serializable;

/**
 * Analytics Result model - represents aggregated analytics
 */
public class AnalyticsResult implements Serializable {
    
    private String metricType;  // "order_count", "revenue", "unique_users"
    private Long windowStart;
    private Long windowEnd;
    private Double value;
    private Long timestamp;
    
    public AnalyticsResult() {}
    
    public AnalyticsResult(String metricType, Long windowStart, Long windowEnd, Double value) {
        this.metricType = metricType;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.value = value;
        this.timestamp = System.currentTimeMillis();
    }
    
    // Getters and Setters
    public String getMetricType() {
        return metricType;
    }
    
    public void setMetricType(String metricType) {
        this.metricType = metricType;
    }
    
    public Long getWindowStart() {
        return windowStart;
    }
    
    public void setWindowStart(Long windowStart) {
        this.windowStart = windowStart;
    }
    
    public Long getWindowEnd() {
        return windowEnd;
    }
    
    public void setWindowEnd(Long windowEnd) {
        this.windowEnd = windowEnd;
    }
    
    public Double getValue() {
        return value;
    }
    
    public void setValue(Double value) {
        this.value = value;
    }
    
    public Long getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
    
    @Override
    public String toString() {
        return "AnalyticsResult{" +
                "metricType='" + metricType + '\'' +
                ", windowStart=" + windowStart +
                ", windowEnd=" + windowEnd +
                ", value=" + value +
                ", timestamp=" + timestamp +
                '}';
    }
}