const User = require('../models/user');
const Order  = require('../models/order');
const DeliveryRating = require('../models/delivery_rating');
const OrderStatusHistory = require("../models/orderStatusHistory");

Order.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Order, { foreignKey: "userId", as: "orders" });

Order.hasMany(OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory" });
OrderStatusHistory.belongsTo(Order, { foreignKey: "orderId" });

Order.belongsTo(User, { as: "delivery", foreignKey: "assignedDeliveryId" });

Order.hasOne(DeliveryRating, { as: "rating", foreignKey: "orderId" });
DeliveryRating.belongsTo(Order, { foreignKey: "orderId" });


module.exports = {
  User,
  Order,
  OrderStatusHistory
};