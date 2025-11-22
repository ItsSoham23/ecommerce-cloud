const { dynamoDBClient, dynamoDB } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'orders';

class OrderModel {
	static async createTable() {
		const params = {
			TableName: TABLE_NAME,
			KeySchema: [
				{ AttributeName: 'orderId', KeyType: 'HASH' }
			],
			AttributeDefinitions: [
				{ AttributeName: 'orderId', AttributeType: 'S' }
			],
			BillingMode: 'PAY_PER_REQUEST',
			Tags: [
				{ Key: 'Service', Value: 'order-service' },
				{ Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
			]
		};

		try {
			await dynamoDBClient.createTable(params).promise();
			console.log(`✅ DynamoDB table '${TABLE_NAME}' created successfully`);
		} catch (error) {
			if (error.code === 'ResourceInUseException') {
				console.log(`ℹ️  DynamoDB table '${TABLE_NAME}' already exists`);
			} else {
				console.error('❌ Error creating orders table:', error);
				throw error;
			}
		}
	}

	static async saveOrder(order) {
		const item = {
			orderId: order.orderId || uuidv4(),
			userId: order.userId,
			items: order.items,
			total: order.total,
			status: order.status || 'PENDING',
			paymentId: order.paymentId || null,
			createdAt: new Date().toISOString()
		};

		const params = {
			TableName: TABLE_NAME,
			Item: item
		};

		await dynamoDB.put(params).promise();
		return item;
	}

	static async getOrder(orderId) {
		const params = {
			TableName: TABLE_NAME,
			Key: { orderId }
		};
		const res = await dynamoDB.get(params).promise();
		return res.Item;
	}

	static async getOrdersByUser(userId) {
		const params = {
			TableName: TABLE_NAME,
			FilterExpression: 'userId = :u',
			ExpressionAttributeValues: {
				':u': userId
			}
		};
		const res = await dynamoDB.scan(params).promise();
		return res.Items || [];
	}

	static async updateOrder(orderId, updates) {
		const ExpressionAttributeNames = {};
		const ExpressionAttributeValues = {};
		const setExpressions = [];
		let idx = 0;
		for (const key of Object.keys(updates)) {
			idx += 1;
			const nameKey = `#k${idx}`;
			const valKey = `:v${idx}`;
			ExpressionAttributeNames[nameKey] = key;
			ExpressionAttributeValues[valKey] = updates[key];
			setExpressions.push(`${nameKey} = ${valKey}`);
		}
		const params = {
			TableName: TABLE_NAME,
			Key: { orderId },
			UpdateExpression: `SET ${setExpressions.join(', ')}`,
			ExpressionAttributeNames,
			ExpressionAttributeValues,
			ReturnValues: 'ALL_NEW'
		};
		const res = await dynamoDB.update(params).promise();
		return res.Attributes;
	}
}

module.exports = OrderModel;
