const client = require('prom-client');
const { register, collectDefaultMetrics } = client;

// Collect default metrics (CPU, Memory, GC, etc.)
collectDefaultMetrics({ prefix: 'product_service_' });

// Define custom metrics
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

const httpResponseTimeSummary = new client.Summary({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    percentiles: [0.5, 0.9, 0.99], // p50, p90, p99
});

/**
 * Middleware to track request metrics (RPS, Latency, etc.)
 */
const metricsMiddleware = (req, res, next) => {
    // Start timer for latency tracking
    const end = httpResponseTimeSummary.startTimer();

    // Custom function to capture metrics when the response finishes
    res.on('finish', () => {
        const route = req.route ? req.route.path : req.path;
        const labels = {
            method: req.method,
            route: route,
            status_code: res.statusCode,
        };

        httpRequestCounter.inc(labels);
        end(labels); // Stop timer and record duration with labels
    });

    next();
};

module.exports = {
    metricsMiddleware,
    register,
    client,
    httpRequestCounter,
    httpResponseTimeSummary,
};