const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/orderRoutes');
const { register, metricsMiddleware } = require('./middleware/metrics');
const OrderModel = require('./models/Order');
const axios = require('axios');
const kafkaService = require('./services/kafkaService');
const paymentConsumer = require('./services/paymentConsumer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8084;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'order-service' }));
app.get('/metrics', async (req, res) => {
	res.set('Content-Type', register.contentType);
	res.end(await register.metrics());
});

app.use('/api/orders', orderRoutes);

// Internal endpoint to receive payment events when Kafka is unavailable.
app.post('/api/internal/payment-event', async (req, res) => {
	try {
		const { topic, message } = req.body || {};
		if (!topic || !message) return res.status(400).json({ error: 'topic and message required' });
		const paymentConsumer = require('./services/paymentConsumer');
		// Call handler directly (no Kafka) and return 200 immediately
		await paymentConsumer.handlePaymentMessage({ topic, message });
		return res.status(200).json({ ok: true });
	} catch (e) {
		console.error('internal payment-event error', e && e.message ? e.message : e);
		return res.status(500).json({ error: 'internal handler error' });
	}
});

// Error handler (MUST be last)
app.use((err, req, res, next) => {
	console.error(err.stack || err);
	res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const startServer = async () => {
	try {
		// If configured to use LocalStack, wait for it to be reachable before creating tables
		if (process.env.USE_LOCALSTACK === 'true') {
			// Try a list of candidate endpoints and pick the first reachable one.
			const candidates = [];
			if (process.env.LOCALSTACK_ENDPOINT) candidates.push(process.env.LOCALSTACK_ENDPOINT.replace(/\/$/, ''));
			candidates.push('http://localstack:4566');
			candidates.push('http://host.docker.internal:4566');
			candidates.push('http://localhost:4566');

			const maxAttempts = 20;
			const delayMs = 2000;
			let chosen = null;

			for (const base of candidates) {
				const healthUrlCandidates = [`${base}/_localstack/health`, `${base}/health`, `${base}/status`];
				console.log(`⏳ Checking LocalStack candidate endpoints for ${base}`);
				let attempt = 0;
				for (; attempt < maxAttempts; attempt += 1) {
					let ok = false;
					for (const h of healthUrlCandidates) {
						try {
							const res = await axios.get(h, { timeout: 2000 });
							if (res && (res.status === 200 || res.status === 204)) {
								chosen = base;
								break;
							}
						} catch (e) {
							// ignore
						}
					}
					if (chosen) break;
					await new Promise((r) => setTimeout(r, delayMs));
				}
				if (chosen) break;
			}

			if (chosen) {
				process.env.LOCALSTACK_ENDPOINT = chosen;
				console.log('✅ LocalStack is reachable at', chosen);
			} else {
				console.warn('⚠️ LocalStack did not become ready at any candidate endpoint; continuing and createTable may fail');
			}
		}

		console.log('⏳ Initializing orders table...');
		await OrderModel.createTable();
		console.log('✅ Orders table ready');

		// Initialize Kafka producer and consumer
		try {
			await kafkaService.initKafka();
			// start payment consumer to listen for payment results
			paymentConsumer.startPaymentConsumer().catch((e) => console.error('Payment consumer error', e));
		} catch (e) {
			console.warn('Kafka init failed or not configured; continuing without Kafka', e.message || e);
		}

		app.listen(PORT, () => {
			console.log(`🚀 Order Service running on port ${PORT}`);
			console.log(`📊 Health: http://localhost:${PORT}/health`);
			console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
		});
	} catch (error) {
		console.error('❌ Unable to start server:', error);
		process.exit(1);
	}
};

startServer();

module.exports = app;
