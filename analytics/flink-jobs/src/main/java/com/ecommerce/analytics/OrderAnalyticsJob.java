package com.ecommerce.analytics;

import com.ecommerce.analytics.model.OrderEvent;
import com.ecommerce.analytics.model.AnalyticsResult;
import com.ecommerce.analytics.functions.*;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.time.Duration;

/**
 * Flink Job for Real-time Order Analytics
 * 
 * This job:
 * 1. Consumes order events from Kafka topic: order-events
 * 2. Performs stateful, time-windowed aggregations (1-minute windows)
 * 3. Publishes results to Kafka topic: analytics-results
 */
public class OrderAnalyticsJob {

    public static void main(String[] args) throws Exception {
        
        // Get Kafka bootstrap servers from environment variable
        String kafkaBootstrapServers = System.getenv().getOrDefault(
            "KAFKA_BOOTSTRAP_SERVERS",
            "localhost:9092"
        );
        
        System.out.println("Starting Order Analytics Job...");
        System.out.println("Kafka Bootstrap Servers: " + kafkaBootstrapServers);
        
        // Set up streaming execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Enable checkpointing for fault tolerance (every 60 seconds)
        env.enableCheckpointing(60000);
        env.getCheckpointConfig().setCheckpointTimeout(120000);
        env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
        
        // Configure Kafka source
        KafkaSource<String> kafkaSource = KafkaSource.<String>builder()
            .setBootstrapServers(kafkaBootstrapServers)
            .setTopics("order-events")
            .setGroupId("flink-analytics-consumer")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .build();
        
        // Create watermark strategy for event time processing
        WatermarkStrategy<String> watermarkStrategy = WatermarkStrategy
            .<String>forBoundedOutOfOrderness(Duration.ofSeconds(5))
            .withTimestampAssigner(new OrderEventTimestampAssigner());
        
        // Read from Kafka
        DataStream<String> orderEventsString = env.fromSource(
            kafkaSource,
            watermarkStrategy,
            "Kafka Order Events Source"
        );
        
        // Parse JSON to OrderEvent objects
        DataStream<OrderEvent> orderEvents = orderEventsString
            .map(new OrderEventParser())
            .filter(event -> event != null);
        
        // Aggregation 1: Count orders per 1-minute window
        DataStream<AnalyticsResult> orderCountResults = orderEvents
            .keyBy(event -> "global") // Single key for global aggregation
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new OrderCountAggregator(), new WindowResultProcessor());
        
        // Aggregation 2: Total revenue per 1-minute window
        DataStream<AnalyticsResult> revenueResults = orderEvents
            .keyBy(event -> "global")
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new RevenueAggregator(), new WindowResultProcessor());
        
        // Aggregation 3: Unique users per 1-minute window
        DataStream<AnalyticsResult> uniqueUserResults = orderEvents
            .keyBy(event -> "global")
            .window(TumblingEventTimeWindows.of(Time.minutes(1)))
            .aggregate(new UniqueUserAggregator(), new WindowResultProcessor());
        
        // Union all results
        DataStream<AnalyticsResult> allResults = orderCountResults
            .union(revenueResults)
            .union(uniqueUserResults);
        
        // Convert to JSON strings
        DataStream<String> resultStrings = allResults.map(new ResultToJsonMapper());
        
        // Configure Kafka sink
        KafkaSink<String> kafkaSink = KafkaSink.<String>builder()
            .setBootstrapServers(kafkaBootstrapServers)
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic("analytics-results")
                    .setValueSerializationSchema(new SimpleStringSchema())
                    .build()
            )
            .build();
        
        // Write results to Kafka
        resultStrings.sinkTo(kafkaSink);
        
        // Print to console for debugging
        allResults.print();
        
        // Execute job
        env.execute("Order Analytics Job");
    }
}