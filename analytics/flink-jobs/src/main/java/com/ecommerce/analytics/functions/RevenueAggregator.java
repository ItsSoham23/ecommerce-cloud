package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.OrderEvent;
import org.apache.flink.api.common.functions.AggregateFunction;

/**
 * Aggregator that sums the total revenue (order amounts) in a window
 */
public class RevenueAggregator implements AggregateFunction<OrderEvent, Double, Double> {
    
    @Override
    public Double createAccumulator() {
        return 0.0;
    }
    
    @Override
    public Double add(OrderEvent event, Double accumulator) {
        return accumulator + event.getTotalAmount();
    }
    
    @Override
    public Double getResult(Double accumulator) {
        return accumulator;
    }
    
    @Override
    public Double merge(Double acc1, Double acc2) {
        return acc1 + acc2;
    }
}