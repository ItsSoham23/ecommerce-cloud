const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  s3Key: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 's3_key'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
  ,
  reservedByOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'reserved_by_order_id'
  },
  reservedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reserved_until'
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

module.exports = Product;