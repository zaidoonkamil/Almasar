const User = require('../models/user');
const Order  = require('../models/order');
const DeliveryRating = require('../models/delivery_rating');
const OrderStatusHistory = require("../models/orderStatusHistory");
const Notification = require("../models/notification");
const Product = require("../models/product");
const OrderItem = require("../models/orderitem");

// user ↔ orders
Order.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });
User.hasMany(Order, { foreignKey: "userId", as: "orders", onDelete: "CASCADE" });

// order ↔ order status history
Order.hasMany(OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory", onDelete: "CASCADE" });
OrderStatusHistory.belongsTo(Order, { foreignKey: "orderId", onDelete: "CASCADE" });

// order ↔ delivery (driver)
Order.belongsTo(User, { as: "delivery", foreignKey: "assignedDeliveryId", onDelete: "SET NULL" });

// order ↔ delivery rating
Order.hasOne(DeliveryRating, { as: "rating", foreignKey: "orderId", onDelete: "CASCADE" });
DeliveryRating.belongsTo(Order, { foreignKey: "orderId", onDelete: "CASCADE" });

// user (vendor) ↔ products
Product.belongsTo(User, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });
User.hasMany(Product, { foreignKey: "vendorId", as: "products", onDelete: "CASCADE" });

// order ↔ order items
Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', onDelete: "CASCADE" });

// order item ↔ product
OrderItem.belongsTo(Product, { foreignKey: 'productId', onDelete: "CASCADE" });

Order.hasMany(OrderItem, { as: "items", foreignKey: "orderId" });
OrderItem.belongsTo(Product, { foreignKey: "productId" });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Product,
  Order,
  OrderStatusHistory,
  DeliveryRating,
  OrderItem
};
