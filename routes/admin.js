const express = require("express");
const router = express.Router();
const { Order, OrderStatusHistory, User } = require("../middlewares/associations");
const multer = require("multer");
const upload = multer();
const moment = require('moment');
const { Op } = require("sequelize");


router.get("/admin/order-pending", async (req, res) => {
    try {
      const orders = await Order.findAll({
        where: {
          status: {
            [Op.in]: ["تم الاستلام", "تبديل الطلب"]
          }
        },
        include: [
          { model: OrderStatusHistory, as: "statusHistory" },
          { model: User, as: "user", attributes: { exclude: ['password'] } }
        ],
        order: [["createdAt", "DESC"]]
      });
  
      res.status(200).json(orders);
  
    } catch (err) {
      console.error("❌ Error fetching selected orders:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

  
router.get("/admin/order-complete", async (req, res) => {
    try {
      const orders = await Order.findAll({
        where: {
          status: {
            [Op.notIn]: ["تم الاستلام", "تبديل الطلب"]
          }
        },
        include: [
          { model: OrderStatusHistory, as: "statusHistory" },
          { model: User, as: "user", attributes: { exclude: ['password'] } }
        ],
        order: [["createdAt", "DESC"]]
      });
  
      res.status(200).json(orders);
  
    } catch (err) {
      console.error("❌ Error fetching filtered orders:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});
  
// جلب جميع الدلفري الفعال
router.get("/admin/delivery-active", async (req, res) => {
    try {
      const activeDeliveries = await User.findAll({
        where: {
          role: "delivery",
          isActive: true
        },
        attributes: { exclude: ['password', 'createdAt'] }
      });
  
      res.status(200).json(activeDeliveries);
    } catch (err) {
      console.error("❌ Error fetching active deliveries:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/admin/dashboard", async (req, res) => {
    try {
      // إجمالي عدد الطلبات
      const totalOrders = await Order.count();
  
      // عدد الطلبات المكتملة
      const completedOrders = await Order.count({
        where: { status: "تم التسليم" }
      });
  
      // عدد الطلبات المسترجعة
      const cancelledOrders = await Order.count({
        where: { status: "استرجاع الطلب" }
      });
  
      // عدد الطلبات المبدلة
      const exchangedOrders = await Order.count({
        where: { status: "تبديل الطلب" }
      });
  
      const totalOrderAmount = await Order.sum("orderAmount");
      const totalDeliveryFee = await Order.sum("deliveryFee");
  
      const totalAmountIncludingFee = totalOrderAmount + totalDeliveryFee;
  
      res.status(200).json({
        message: "Admin dashboard statistics",
        totalOrders,
        completedOrders,
        cancelledOrders,
        exchangedOrders,
        totalOrderAmount,
        totalDeliveryFee,
        totalAmountIncludingFee,
      });
  
    } catch (err) {
      console.error("❌ Error fetching admin dashboard data:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/admin/today-dashboard", async (req, res) => {
    const { Op } = require("sequelize");
  
    // بداية اليوم
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
  
    try {
      const totalOrders = await Order.count({
        where: {
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const completedOrders = await Order.count({
        where: {
          status: "تم التسليم",
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const cancelledOrders = await Order.count({
        where: {
          status: "استرجاع الطلب",
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const exchangedOrders = await Order.count({
        where: {
          status: "تبديل الطلب",
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const totalOrderAmount = await Order.sum("orderAmount", {
        where: {
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const totalDeliveryFee = await Order.sum("deliveryFee", {
        where: {
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });
  
      const totalAmountIncludingFee = (totalOrderAmount || 0) + (totalDeliveryFee || 0);
  
      res.status(200).json({
        message: "Today's admin dashboard statistics",
        totalOrders,
        completedOrders,
        cancelledOrders,
        exchangedOrders,
        totalOrderAmount: totalOrderAmount || 0,
        totalDeliveryFee: totalDeliveryFee || 0,
        totalAmountIncludingFee
      });
  
    } catch (err) {
      console.error("❌ Error fetching today's admin dashboard data:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;