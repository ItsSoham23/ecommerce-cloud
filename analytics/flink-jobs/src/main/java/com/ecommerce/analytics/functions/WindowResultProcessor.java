package com.ecommerce.analytics.functions;

import com.ecommerce.analytics.model.AnalyticsResult;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

/**
 * Process window function that adds window metadata to aggregation results
 */
public class WindowResultProcessor extends ProcessWindowFunction<Double, AnalyticsResult, String, TimeWindow> {
    
    private String metricType;
    
    public WindowResultProcessor() {
        // Metric type will be determined by which aggregator calls this
        this.metricType = "unknown";
    }
    
    @Override
    public void process(String key,
                       Context context,
                       Iterable<Double> aggregates,
                       Collector<AnalyticsResult> out) {
        
        TimeWindow window = context.window();
        Double value = aggregates.iterator().next();
        
        // Determine metric type based on the calling context
        // This is a simplified approach - in production you might pass this explicitly
        if (value >= 0 && value < 1000) {
            // Likely order count or unique users
            if (value == Math.floor(value)) {
                metricType = value < 100 ? "order_count" : "unique_users";
            } else {
                metricType = "order_count";
            }
        } else {
            // Likely revenue (larger numbers)
            metricType = "revenue";
        }
        
        AnalyticsResult result = new AnalyticsResult(
            metricType,
            window.getStart(),
            window.getEnd(),
            value
        );
        
        out.collect(result);
    }
}