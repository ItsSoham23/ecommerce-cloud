const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS S3
const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Use LocalStack for local development
if (process.env.USE_LOCALSTACK === 'true') {
  s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
  s3Config.s3ForcePathStyle = true;
  s3Config.accessKeyId = 'test';
  s3Config.secretAccessKey = 'test';
} else {
  s3Config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  s3Config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const s3 = new AWS.S3(s3Config);

module.exports = { s3 };