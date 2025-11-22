package com.ecommerce.analytics.model;

import java.io.Serializable;
import java.time.Instant;

/**
 * Order Event model - represents an order event from Kafka
 */
public class OrderEvent implements Serializable {
    
    private Long orderId;
    private Long userId;
    private Double totalAmount;
    private Integer itemsCount;
    private Instant timestamp;
    
    public OrderEvent() {}
    
    public OrderEvent(Long orderId, Long userId, Double totalAmount, Integer itemsCount, Instant timestamp) {
        this.orderId = orderId;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.itemsCount = itemsCount;
        this.timestamp = timestamp;
    }
    
    // Getters and Setters
    public Long getOrderId() {
        return orderId;
    }
    
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Double getTotalAmount() {
        return totalAmount;
    }
    
    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public Integer getItemsCount() {
        return itemsCount;
    }
    
    public void setItemsCount(Integer itemsCount) {
        this.itemsCount = itemsCount;
    }
    
    public Instant getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
    
    @Override
    public String toString() {
        return "OrderEvent{" +
                "orderId=" + orderId +
                ", userId=" + userId +
                ", totalAmount=" + totalAmount +
                ", itemsCount=" + itemsCount +
                ", timestamp=" + timestamp +
                '}';
    }
}