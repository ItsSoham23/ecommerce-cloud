const AWS = require('aws-sdk');
require('dotenv').config();

const dynamoDBConfig = {
	region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.USE_LOCALSTACK === 'true') {
	dynamoDBConfig.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
	dynamoDBConfig.accessKeyId = 'test';
	dynamoDBConfig.secretAccessKey = 'test';
} else {
	dynamoDBConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	dynamoDBConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDBConfig);
const dynamoDBClient = new AWS.DynamoDB(dynamoDBConfig);

module.exports = { dynamoDB, dynamoDBClient };
