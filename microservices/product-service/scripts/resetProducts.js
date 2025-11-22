/*
  resetProducts.js
  One-off script to delete all products and insert a fresh set of products.
  Usage (recommended): copy into the running product-service container and run there so it uses the container's DB env.
    docker cp scripts/resetProducts.js <product-container>:/app/scripts/resetProducts.js
    docker exec -i <product-container> node /app/scripts/resetProducts.js

  This script uses the same Sequelize models as the service.
*/

const { sequelize } = require('../src/config/database');
const Product = require('../src/models/Product');

async function reset() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Connected. Deleting existing products...');

    // Hard delete all rows and restart identity (Postgres)
    // Use a raw query to ensure ids are reset.
    await sequelize.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');

    const products = [
      {
        name: 'Comfy Cotton T-Shirt',
        description: 'Soft, breathable cotton t-shirt available in multiple colors.',
        price: 19.99,
        category: 'Apparel',
        stock: 150,
        imageUrl: null,
        isActive: true
      },
      {
        name: 'Stainless Water Bottle 750ml',
        description: 'Insulated water bottle keeps drinks cold for 24 hours.',
        price: 24.5,
        category: 'Outdoors',
        stock: 200,
        imageUrl: null,
        isActive: true
      },
      {
        name: 'Noise-Cancelling Headphones',
        description: 'Over-ear headphones with active noise cancellation and long battery life.',
        price: 129.99,
        category: 'Electronics',
        stock: 75,
        imageUrl: null,
        isActive: true
      },
      {
        name: 'Ergonomic Office Chair',
        description: 'Comfortable mesh chair with lumbar support for long work sessions.',
        price: 199.0,
        category: 'Furniture',
        stock: 30,
        imageUrl: null,
        isActive: true
      },
      {
        name: 'Ceramic Coffee Mug - 12oz',
        description: 'Microwave and dishwasher safe ceramic mug.',
        price: 9.99,
        category: 'Home',
        stock: 300,
        imageUrl: null,
        isActive: true
      }
    ];

    console.log('Inserting new products...');
    for (const p of products) {
      await Product.create(p);
      console.log('Inserted:', p.name);
    }

    console.log('Product reset complete.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to reset products:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

reset();
