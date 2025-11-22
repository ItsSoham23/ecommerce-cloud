const { Kafka } = require('kafkajs');
const CartService = require('../services/cartService');
const CartModel = require('../models/Cart');
const { dynamoDB } = require('../config/database');
const { log, error } = require('../utils/logger');

const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const kafka = new Kafka({ clientId: 'cart-service-product-consumer', brokers });

async function start() {
  const consumer = kafka.consumer({ groupId: 'cart-service-product-deleted-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'product.deleted', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        const productId = payload.productId;
        log(`Received product.deleted for productId=${productId}`);

        // Scan all carts and remove this product where present
        const tableName = CartModel.getTableName();
        let ExclusiveStartKey = undefined;
        do {
          const params = { TableName: tableName };
          if (ExclusiveStartKey) params.ExclusiveStartKey = ExclusiveStartKey;
          const res = await dynamoDB.scan(params).promise();
          const items = res.Items || [];
          for (const cart of items) {
            if (!cart.items || !Array.isArray(cart.items)) continue;
            const found = cart.items.find(i => String(i.productId) === String(productId));
            if (found) {
              try {
                await CartService.removeItem(cart.userId, String(productId));
                log(`Removed product ${productId} from cart of user ${cart.userId}`);
              } catch (e) {
                error(`Failed to remove product ${productId} from cart ${cart.userId}`, e && e.message ? e.message : e);
              }
            }
          }
          ExclusiveStartKey = res.LastEvaluatedKey;
        } while (ExclusiveStartKey);
      } catch (e) {
        error('Error processing product.deleted message', e && e.message ? e.message : e);
      }
    }
  });

  log('product.deleted consumer started');
}

module.exports = { start };
