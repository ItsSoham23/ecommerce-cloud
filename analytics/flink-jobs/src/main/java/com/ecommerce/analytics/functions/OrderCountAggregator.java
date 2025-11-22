package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.OrderEvent;
import org.apache.flink.api.common.functions.AggregateFunction;

/**
 * Aggregator that counts the number of orders in a window
 */
public class OrderCountAggregator implements AggregateFunction<OrderEvent, Long, Double> {
    
    @Override
    public Long createAccumulator() {
        return 0L;
    }
    
    @Override
    public Long add(OrderEvent event, Long accumulator) {
        return accumulator + 1;
    }
    
    @Override
    public Double getResult(Long accumulator) {
        return accumulator.doubleValue();
    }
    
    @Override
    public Long merge(Long acc1, Long acc2) {
        return acc1 + acc2;
    }
}