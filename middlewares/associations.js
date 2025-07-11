const User = require('../models/user');
const Order  = require('../models/order');
const DeliveryRating = require('../models/delivery_rating');
const OrderStatusHistory = require("../models/orderStatusHistory");
const UserDevice = require('../models/user_device.js'); 
const Notification = require("../models/notification");
const Product = require("../models/product");
const OrderItem = require("../models/orderitem");
const Cart = require("../models/cart"); 

Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product', onDelete: 'CASCADE' });
Product.hasMany(Cart, { foreignKey: 'productId', as: 'carts', onDelete: 'CASCADE' });

// User ↔ Orders (client)
User.hasMany(Order, { foreignKey: "userId", as: "orders", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });

// User ↔ Orders (delivery/driver)
User.hasMany(Order, { foreignKey: "assignedDeliveryId", as: "deliveries", onDelete: "SET NULL" });
Order.belongsTo(User, { foreignKey: "assignedDeliveryId", as: "delivery", onDelete: "SET NULL" });

// User ↔ Products (vendor)
User.hasMany(Product, { foreignKey: "vendorId", as: "products", onDelete: "CASCADE" });
Product.belongsTo(User, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });

// User ↔ Notifications
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

// Order ↔ OrderItems
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order", onDelete: "CASCADE" });

// Order ↔ OrderStatusHistory
Order.hasMany(OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory", onDelete: "CASCADE" });
OrderStatusHistory.belongsTo(Order, { foreignKey: "orderId", as: "order", onDelete: "CASCADE" });

// Order ↔ DeliveryRating
Order.hasOne(DeliveryRating, { foreignKey: "orderId", as: "rating", onDelete: "CASCADE" });
DeliveryRating.belongsTo(Order, { foreignKey: "orderId", as: "order", onDelete: "CASCADE" });

// OrderItem ↔ Product
OrderItem.belongsTo(Product, { foreignKey: "productId", onDelete: "CASCADE" });
Product.hasMany(OrderItem, { foreignKey: "productId", onDelete: "CASCADE" });

User.hasMany(UserDevice, { foreignKey: "user_id", as: "devices", onDelete: "CASCADE" });
UserDevice.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });


module.exports = {
  User,
  UserDevice,
  Product,
  Order,
  OrderStatusHistory,
  DeliveryRating,
  OrderItem,
  Notification,
  Cart
};
