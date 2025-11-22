const axios = require('axios');

function createClient(baseURL, timeout = 5000) {
	return axios.create({
		baseURL,
		timeout,
		headers: { 'Content-Type': 'application/json' }
	});
}

module.exports = { createClient };
