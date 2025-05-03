const User = require('../models/user');
const Order  = require('../models/order');
const OrderStatusHistory = require("../models/orderStatusHistory");

Order.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Order, { foreignKey: "userId", as: "orders" });

Order.hasMany(OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory" });
OrderStatusHistory.belongsTo(Order, { foreignKey: "orderId" });

module.exports = {
  User,
  Order,
  OrderStatusHistory
};