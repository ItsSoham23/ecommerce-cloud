const client = require('prom-client');
const { register } = client;

// DO NOT collect default metrics here - will be done in index.js

// Define custom metrics only
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

const httpResponseTimeSummary = new client.Summary({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    percentiles: [0.5, 0.9, 0.99],
});

const cartOperationsCounter = new client.Counter({
    name: 'cart_operations_total',
    help: 'Total number of cart operations',
    labelNames: ['operation', 'status'],
});

const metricsMiddleware = (req, res, next) => {
    const end = httpResponseTimeSummary.startTimer();

    res.on('finish', () => {
        const route = req.route ? req.route.path : req.path;
        const labels = {
            method: req.method,
            route: route,
            status_code: res.statusCode,
        };

        httpRequestCounter.inc(labels);
        end(labels);
    });

    next();
};

module.exports = {
    metricsMiddleware,
    register,
    client,
    httpRequestCounter,
    httpResponseTimeSummary,
    cartOperationsCounter,
};