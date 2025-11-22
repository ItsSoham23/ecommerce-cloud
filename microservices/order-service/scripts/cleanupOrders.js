/*
  cleanupOrders.js
  One-off script to delete all orders from the orders DynamoDB table used by order-service.
  Usage: from the repo root or microservices/order-service directory with env configured for LocalStack:
    node scripts/cleanupOrders.js
*/

const { DynamoDB } = require('aws-sdk');

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'orders';

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
};
if (process.env.USE_LOCALSTACK === 'true' || process.env.LOCALSTACK_ENDPOINT) {
  config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
  config.accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'test';
  config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'test';
}

const client = new DynamoDB.DocumentClient(config);

async function scanAll() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await client.scan({ TableName: TABLE_NAME, ExclusiveStartKey }).promise();
    if (res.Items && res.Items.length) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function deleteByKey(key) {
  const params = { TableName: TABLE_NAME, Key: key };
  await client.delete(params).promise();
}

(async () => {
  try {
    console.log('Scanning table', TABLE_NAME);
    const items = await scanAll();
    console.log('Total orders found:', items.length);

    if (items.length === 0) {
      console.log('No orders to delete.');
      return;
    }

    for (const itm of items) {
      console.log('Deleting orderId:', itm.orderId, 'status:', itm.status || '<none>');
      await deleteByKey({ orderId: itm.orderId });
    }

    const remaining = await scanAll();
    console.log('Done. Remaining orders in table:', remaining.length);
  } catch (e) {
    console.error('Error during cleanup:', e);
    process.exit(2);
  }
})();
