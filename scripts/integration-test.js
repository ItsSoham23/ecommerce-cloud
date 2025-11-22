const http = require('http');
const { exec } = require('child_process');

function httpRequest(url, method = 'GET', body = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout,
    };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        const text = chunks || '';
        let json = null;
        try { json = JSON.parse(text); } catch (e) { /* not json */ }
        resolve({ statusCode: res.statusCode, body: json || text });
      });
    });
    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout && stdout.trim(), stderr: stderr && stderr.trim() });
    });
  });
}

async function main() {
  const results = [];

  // 1) Check docker containers for payment-service
  const dockerCheck = await runCmd('docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"');
  const containers = (dockerCheck.stdout || '').split('\n').filter(Boolean);
  const hasPayment = containers.find(c => c.startsWith('payment-service')) !== undefined;
  results.push({ check: 'payment-container-running', ok: hasPayment, detail: hasPayment ? 'payment-service present' : 'payment-service not present' });

  // 2) HTTP checks
  const checks = [
    { name: 'users', url: 'http://host.docker.internal:8081/api/users', method: 'GET' },
    { name: 'products', url: 'http://host.docker.internal:8082/api/products', method: 'GET' },
    { name: 'cart', url: 'http://host.docker.internal:8083/api/cart/1', method: 'GET' },
  ];

  for (const c of checks) {
    try {
      const r = await httpRequest(c.url, c.method);
      const ok = r.statusCode && r.statusCode >= 200 && r.statusCode < 300;
      results.push({ check: `http-${c.name}`, ok, statusCode: r.statusCode, summary: (typeof r.body === 'string') ? r.body.slice(0,200) : JSON.stringify(r.body).slice(0,200) });
    } catch (e) {
      results.push({ check: `http-${c.name}`, ok: false, error: e.message });
    }
  }

  // 3) Try to create an order (this will exercise order + kafka + payment)
  const orderBody = { userId: '1', items: [ { productId: '2', quantity: 1 }, { productId: '6', quantity: 1 } ] };
  try {
    const r = await httpRequest('http://host.docker.internal:8084/api/orders', 'POST', orderBody, 20000);
    const ok = r.statusCode >= 200 && r.statusCode < 300 && r.body && r.body.orderId;
    results.push({ check: 'create-order', ok, statusCode: r.statusCode, response: r.body });
  } catch (e) {
    results.push({ check: 'create-order', ok: false, error: e.message });
  }

  // 4) Scan 'orders' table directly using AWS SDK (works when running inside the container)
  try {
    const AWS = require('aws-sdk');
    const endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
    const cfg = { region: 'us-east-1', endpoint, accessKeyId: 'test', secretAccessKey: 'test' };
    const docc = new AWS.DynamoDB.DocumentClient(cfg);
    const scanRes = await new Promise((resolve, reject) => docc.scan({ TableName: 'orders' }, (e, r) => (e ? reject(e) : resolve(r))));
    results.push({ check: 'scan-orders-table', ok: true, itemsPreview: JSON.stringify(scanRes.Items || [], null, 2).slice(0, 2000) });
  } catch (e) {
    results.push({ check: 'scan-orders-table', ok: false, error: (e && e.message) || e });
  }

  // Summary
  console.log('\n=== Integration test results ===');
  let failures = 0;
  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL';
    console.log(`- ${r.check}: ${status}`);
    if (!r.ok) failures++;
  }
  console.log('\nFull results JSON:\n', JSON.stringify(results, null, 2));
  process.exit(failures === 0 ? 0 : 2);
}

main();
