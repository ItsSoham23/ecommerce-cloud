const { dynamoDB } = require('../src/config/database');
const TABLE_NAME = process.env.DYNAMODB_ORDERS_TABLE || 'orders';

async function deleteOrdersForUser(userEmail) {
  try {
    // Scan for items with matching userId
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userEmail }
    };

    const res = await dynamoDB.scan(scanParams).promise();
    const items = res.Items || [];
    if (items.length === 0) {
      console.log(`No orders found for user ${userEmail}`);
      return;
    }

    console.log(`Found ${items.length} orders for user ${userEmail}. Deleting...`);

    for (const it of items) {
      const key = { orderId: it.orderId };
      const delParams = { TableName: TABLE_NAME, Key: key };
      try {
        await dynamoDB.delete(delParams).promise();
        console.log(`Deleted order ${it.orderId}`);
      } catch (e) {
        console.error(`Failed to delete order ${it.orderId}:`, e.message || e);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error scanning orders:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) {
    console.error('Usage: node deleteOrdersByUser.js <userId>');
    process.exit(2);
  }
  deleteOrdersForUser(user).then(() => process.exit(0));
}

module.exports = { deleteOrdersForUser };