package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.OrderEvent;
import org.apache.flink.api.common.functions.AggregateFunction;

import java.util.HashSet;
import java.util.Set;

/**
 * Aggregator that counts unique users in a window
 * This is a STATEFUL aggregation - maintains a set of user IDs
 */
public class UniqueUserAggregator implements AggregateFunction<OrderEvent, Set<Long>, Double> {
    
    @Override
    public Set<Long> createAccumulator() {
        return new HashSet<>();
    }
    
    @Override
    public Set<Long> add(OrderEvent event, Set<Long> accumulator) {
        accumulator.add(event.getUserId());
        return accumulator;
    }
    
    @Override
    public Double getResult(Set<Long> accumulator) {
        return (double) accumulator.size();
    }
    
    @Override
    public Set<Long> merge(Set<Long> acc1, Set<Long> acc2) {
        acc1.addAll(acc2);
        return acc1;
    }
}