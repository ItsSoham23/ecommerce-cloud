/*
 One-off script to delete orders except those with status FAILED or CANCELLED.
 Usage: node scripts/cleanupOrders.js
 It uses the same LocalStack/DynamoDB config as the service (reads env).
*/

const { DynamoDB } = require('aws-sdk');
require('dotenv').config();

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
const db = new DynamoDB(config);

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

    const toDelete = items.filter(it => {
      const status = (it.status || '').toUpperCase();
      return !(status === 'FAILED' || status === 'CANCELLED');
    });

    console.log('Orders to delete (count):', toDelete.length);
    for (const itm of toDelete) {
      console.log('Deleting orderId:', itm.orderId, 'status:', itm.status || '<none>');
      await deleteByKey({ orderId: itm.orderId });
    }

    console.log('Done. Deleted', toDelete.length, 'orders.');
  } catch (e) {
    console.error('Error during cleanup:', e);
    process.exit(2);
  }
})();
