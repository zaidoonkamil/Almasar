const express = require("express");
const router = express.Router();
const { Order, OrderStatusHistory, User } = require("../middlewares/associations");
const multer = require("multer");
const upload = multer();
const moment = require('moment');
const { Op } = require("sequelize");


router.get("/admin/all-orders", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              attributes: ["id", "title", "price", "images"]
            }
          ]
        },
        { model: OrderStatusHistory, as: "statusHistory", order: [["createdAt", "DESC"]] },
        { model: User, as: "user", attributes: { exclude: ['password'] } },
        { model: User, as: "delivery", attributes: ["id", "name", "phone", "location", "createdAt"] }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    // لو الطلب بدون منتجات — نرجع items: null بدل []
    const formattedOrders = orders.map(order => {
      const items = order.items && order.items.length > 0 ? order.items : null;
      return { ...order.toJSON(), items };
    });

    res.status(200).json({
      totalOrders: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      orders: formattedOrders
    });

  } catch (err) {
    console.error("❌ Error fetching all orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/admin/order-pending", async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        status: {
          [Op.in]: ["تم الاستلام"]
        }
      },
      include: [
        {
          model: OrderStatusHistory,
          as: "statusHistory",
          include: [
            {
              model: Driver,  // موديل الدلفري
              as: "driver",   // حسب تعريف العلاقة
              attributes: ['id', 'name', 'phone'] // الحقول اللي تبيها
            }
          ],
          where: {
            status: "مرفوض"  // أو الحالة التي تعني رفض الطلب
          },
          required: false   // حتى تجلب الطلبات حتى لو ما فيها رفض
        },
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