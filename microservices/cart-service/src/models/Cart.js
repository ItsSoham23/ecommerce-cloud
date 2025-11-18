const { dynamoDBClient } = require('../config/database');

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'Carts';

class CartModel {
  static async createTable() {
    const params = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      Tags: [
        { Key: 'Service', Value: 'cart-service' },
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
        console.error('❌ Error creating table:', error);
        throw error;
      }
    }
  }

  static getTableName() {
    return TABLE_NAME;
  }
}

module.exports = CartModel;
