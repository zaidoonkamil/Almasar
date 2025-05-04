const express = require("express");
const router = express.Router();
const { Order, OrderStatusHistory, User } = require("../middlewares/associations");
const DeliveryRating = require("../models/delivery_rating");
const multer = require("multer");
const { Op } = require("sequelize");
const upload = multer();
const moment = require('moment');


//  تغيير حالة الدلفري فعال او غير فعال
router.put("/delivery/:id/status", async (req, res) => {
    const { isActive } = req.body;
    try {
 
        const deliveryUser = await User.findByPk(req.params.id , {
            attributes: { exclude: ['password', 'createdAt' ]},
        });

        if (deliveryUser.role !== "delivery") {
            return res.status(400).json({ error: "User is not a delivery person" });
        }
       
        if (!deliveryUser) return res.status(404).json({ error: "Delivery not found" });

        deliveryUser.isActive = isActive;
        await deliveryUser.save();

        const updatedAtLocal = moment.utc(deliveryUser.updatedAt).local().format('YYYY-MM-DD HH:mm:ss');

        const io = req.app.get("io");
        io.emit("deliveryStatusUpdated", {
          id: deliveryUser.id,
          isActive: deliveryUser.isActive,
          updatedAt: updatedAtLocal
        });

        res.status(200).json({
            message: "Delivery status updated",
            deliveryUser: {
                ...deliveryUser.toJSON(),
                updatedAt: updatedAtLocal 
            }
        });
    } catch (err) {
        console.error("❌ Error updating delivery status:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// احصائية كلية عن الدلفري
router.get("/delivery/:id/dashboard", async (req, res) => {
  const deliveryId = req.params.id;

  try {
      const orderCount = await Order.count({
          where: {
              assignedDeliveryId: deliveryId
          }
      });
      const deliveredOrderComplet = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "تم التسليم"
        }
      });
      const deliveredOrderCancelled = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "استرجاع الطلب"
        }
      });
      const deliveredOrderExchange = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "تبديل الطلب"
        }
      });
      const totalOrderAmount = await Order.sum('orderAmount', {
        where: {
            assignedDeliveryId: deliveryId
        }
      });
      const totalDeliveryFee = await Order.sum('orderAmount', {
        where: {
            assignedDeliveryId: deliveryId
        }
      });
      const totalAmountIncludingFee = totalOrderAmount + totalDeliveryFee;
      const ratingStats = await DeliveryRating.findAll({
        where: { deliveryId },
        attributes: [
          [DeliveryRating.sequelize.fn("AVG", DeliveryRating.sequelize.col("rating")), "avgRating"],
          [DeliveryRating.sequelize.fn("COUNT", DeliveryRating.sequelize.col("id")), "totalRatings"]
        ],
        raw: true
      });


      const averageRating = Number(ratingStats[0].avgRating || 0).toFixed(2);
      const totalRatings = ratingStats[0].totalRatings;
      res.status(200).json({
          message: "Number of orders assigned to delivery",
          orderCount: orderCount,
          deliveredOrderComplet: deliveredOrderComplet,
          deliveredOrderCancelled: deliveredOrderCancelled,
          deliveredOrderExchange: deliveredOrderExchange,
          deliveryFee: totalDeliveryFee,
          totalAmountIncludingFee: totalAmountIncludingFee,
          averageRating,
          totalRatings
      });

  } catch (err) {
      console.error("❌ Error fetching assigned orders count:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// احصائية يومية عن الدلفري
router.get("/delivery/:id/today-dashboard", async (req, res) => {
  const deliveryId = req.params.id;

  // بداية اليوم
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  try {
      const orderCount = await Order.count({
          where: {
              assignedDeliveryId: deliveryId,
              createdAt: {
                  [Op.gte]: startOfToday
              }
          }
      });

      const deliveredOrderComplet = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "تم التسليم",
            createdAt: {
                [Op.gte]: startOfToday
            }
        }
      });

      const deliveredOrderCancelled = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "استرجاع الطلب",
            createdAt: {
                [Op.gte]: startOfToday
            }
        }
      });

      const deliveredOrderExchange = await Order.count({
        where: {
            assignedDeliveryId: deliveryId,
            status: "تبديل الطلب",
            createdAt: {
                [Op.gte]: startOfToday
            }
        }
      });

      const totalOrderAmount = await Order.sum('orderAmount', {
        where: {
            assignedDeliveryId: deliveryId,
            createdAt: {
                [Op.gte]: startOfToday
            }
        }
      });

      const totalDeliveryFee = await Order.sum('deliveryFee', {
        where: {
            assignedDeliveryId: deliveryId,
            createdAt: {
                [Op.gte]: startOfToday
            }
        }
      });

      const totalAmountIncludingFee = (totalOrderAmount || 0) + (totalDeliveryFee || 0);

      res.status(200).json({
          message: "Today's stats for delivery",
          orderCount,
          deliveredOrderComplet,
          deliveredOrderCancelled,
          deliveredOrderExchange,
          totalOrderAmount: totalOrderAmount || 0,
          totalDeliveryFee: totalDeliveryFee || 0,
          totalAmountIncludingFee
      });

  } catch (err) {
      console.error("❌ Error fetching today's assigned orders stats:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;