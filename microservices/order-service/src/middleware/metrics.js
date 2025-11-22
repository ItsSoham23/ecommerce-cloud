const client = require('prom-client');

const register = new client.Registry();
const httpRequestDurationMs = new client.Histogram({
	name: 'order_service_http_request_duration_ms',
	help: 'Duration of HTTP requests in ms',
	labelNames: ['method', 'route', 'code']
});

register.registerMetric(httpRequestDurationMs);

function metricsMiddleware(req, res, next) {
	const end = httpRequestDurationMs.startTimer();
	res.on('finish', () => {
		end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
	});
	next();
}

module.exports = { register, metricsMiddleware };
