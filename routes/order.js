const express = require("express");
const router = express.Router();
const { Order, OrderStatusHistory, User } = require("../middlewares/associations");
const DeliveryRating = require("../models/delivery_rating");
const multer = require("multer");
const upload = multer();

// اسناد الطلب الى دلفري معين
router.put("/order/:id/assign",upload.none(), async (req, res) => {
    const { deliveryId } = req.body;
    const order = await Order.findByPk(req.params.id);
  
    if (!order) return res.status(404).json({ error: "Order not found" });
  
    order.assignedDeliveryId = deliveryId;
    await order.save();
  
    const io = req.app.get("io");
    io.emit("orderAssigned", {
        orderId: order.id,
        assignedDeliveryId: deliveryId
    });

    res.json({ message: "Order assigned to delivery", order });
});

// قبول او رفض الطلب من قبل الدلفري
router.put("/order/:id/delivery-accept",upload.none(), async (req, res) => {
  
    const { accept, deliveryId } = req.body;
    const order = await Order.findByPk(req.params.id);
  
    if (!order) return res.status(404).json({ error: "Order not found" });
  
    if (order.assignedDeliveryId !== parseInt(deliveryId)) {
        return res.status(403).json({ error: "You are not assigned to this order" });
    }

    const io = req.app.get("io"); 

    if (accept) {
      res.json({ message: "Delivery accepted the order", order });
    } else {
      order.status = "تم الاستلام";
      order.assignedDeliveryId = null;
      await order.save();
      io.emit("orderRefusedByDelivery", {
        orderId: order.id,
        status: order.status
      });
      res.json({ message: "Delivery refused the order, status reset", order });
    }
});

// جلب جميع الطلبات لدلفري معين
router.get("/delivery/:id/all-orders-delivery", async (req, res) => {
  const deliveryId = req.params.id;

  try {
    const orders = await Order.findAll({
      where: {
        assignedDeliveryId: deliveryId
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone"]
        },
        {
          model: OrderStatusHistory,
          as: "statusHistory"
        }
      ]
    });

    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders for delivery:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// جلب جميع الطلبات لدلفري معين الحالة الاولى
router.get("/delivery/:id/firststatus-orders-delivery", async (req, res) => {
  const deliveryId = req.params.id;
  const io = req.app.get("io"); 

  try {
    const orders = await Order.findAll({
      where: {
        assignedDeliveryId: deliveryId,
        status: "تم الاستلام"
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "location"]
        },
        {
          model: OrderStatusHistory,
          as: "statusHistory"
        }
      ]
    });

    io.emit(`deliveryOrders_${deliveryId}`, orders);

    res.json(orders);

  } catch (err) {
    console.error("❌ Error fetching assigned orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.post("/orders", upload.none(), async (req, res) => {
    const { address, phone, orderAmount, deliveryFee, notes, userId } = req.body;

    try {
        const order = await Order.create({
            userId,
            address,
            phone,
            orderAmount,
            deliveryFee,
            notes,
            
        });

        await OrderStatusHistory.create({
            orderId: order.id,
            status: order.status
        });

        res.status(201).json(order);
    } catch (err) {
        console.error("❌ Error creating order:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.get("/orders", async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: [
          { model: OrderStatusHistory, as: "statusHistory" },
          { model: User, as: "user" },
          { model: User, as: "user", attributes: { exclude: ['password'] }},
          { model: DeliveryRating, as: "rating" } ,
        ],
        order: [["createdAt", "DESC"]]
      });
  
      res.status(200).json(orders);
  
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});


router.put("/orders/:id/status", upload.none(), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
      const validStatuses = ["تم الاستلام", "تم التسليم", "استرجاع الطلب", "تبديل الطلب"];
      if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status value" });
      }

      const order = await Order.findByPk(id, {
          include: [{ model: OrderStatusHistory, as: "statusHistory" }]
      });

      if (!order) {
          return res.status(404).json({ error: "Order not found" });
      }

      // حفظ قيمة assignedDeliveryId
      const currentAssignedDeliveryId = order.assignedDeliveryId;

      // تحديث الحالة
      order.status = status;

      // التأكد من الحفاظ على قيمة assignedDeliveryId
      order.assignedDeliveryId = currentAssignedDeliveryId;

      await order.save();

      // تسجيل سجل الحالة
      await OrderStatusHistory.create({
          orderId: order.id,
          status: status
      });

      // جلب الطلب مع السجل بعد التحديث
      const updatedOrder = await Order.findByPk(id, {
          include: [{ model: OrderStatusHistory, as: "statusHistory" }],
          order: [[{ model: OrderStatusHistory, as: "statusHistory" }, "changeDate", "ASC"]]
      });

      res.status(200).json({
          message: "Order status updated successfully",
          order: updatedOrder
      });

  } catch (err) {
      console.error("❌ Error updating order status:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get("/orders/:userId", async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: orders } = await Order.findAndCountAll({
            where: { userId },
            include: [{ model: OrderStatusHistory, as: "statusHistory" }],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        res.status(200).json({
            totalOrders: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            orders
        });

    } catch (err) {
        console.error("❌ Error fetching orders:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



module.exports = router;
