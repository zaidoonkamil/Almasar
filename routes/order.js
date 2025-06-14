const express = require("express");
const router = express.Router();
const { Order, OrderStatusHistory, User } = require("../middlewares/associations");
const DeliveryRating = require("../models/delivery_rating");
const Product = require("../models/product");
const OrderItem = require("../models/orderitem");
const multer = require("multer");
const upload = multer();
const { Op } = require("sequelize");
const Cart = require("../models/cart");
const Notification = require("../models/notification"); 
const { sendNotificationToRole , sendNotificationToUser } = require("../services/notifications");


// اسناد الطلب الى دلفري معين
router.put("/order/:id/assign",upload.none(), async (req, res) => {
    const { deliveryId } = req.body;
    const order = await Order.findByPk(req.params.id);
  
    if (!order) return res.status(404).json({ error: "Order not found" });
  
    order.assignedDeliveryId = deliveryId;
    await order.save();
    await sendNotificationToUser(deliveryId, 'لديك طلب جديد قم بمراجعته ', "طلب جديد");
    /*await Notification.create({
      user_id: deliveryId,
      title:  "طلب جديد",
       message: 'لديك طلب جديد قم بمراجعته '
    });*/
    res.json({ message: "Order assigned to delivery", order });
});

// قبول او رفض الطلب من قبل الدلفري
router.put("/order/:id/delivery-accept", upload.none(), async (req, res) => {
  const { accept, deliveryId, rejectionReason } = req.body;
  const order = await Order.findByPk(req.params.id);

  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.assignedDeliveryId !== parseInt(deliveryId)) {
    return res.status(403).json({ error: "You are not assigned to this order" });
  }

  const isAccepting = accept === "true" || accept === true;

  if (isAccepting) {
    // قبول الطلب
    order.isAccepted = true;
    // يظل assignedDeliveryId زي ما هو
    await order.save();
    res.json({ message: "Delivery accepted the order", order });
  } else {
    // رفض الطلب
    if (!rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required when refusing the order" });
    }

    order.status = "تم الاستلام";
    order.assignedDeliveryId = null;
    order.isAccepted = false;
    order.rejectionReason = rejectionReason;
    await order.save();
    res.json({ message: "Delivery refused the order, status reset", order });
  }
});


// جلب جميع الطلبات لدلفري معين
router.get("/delivery/:id/all-orders-delivery", async (req, res) => {
  const deliveryId = req.params.id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        assignedDeliveryId: deliveryId
      },
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
        {
          model: OrderStatusHistory,
          as: "statusHistory",
          order: [["createdAt", "DESC"]]
        },
        {
          model: User,
          as: "user",
          attributes: { exclude: ['password'] }
        },
        {
          model: User,
          as: "delivery",
          attributes: ["id", "name", "phone", "location", "createdAt"]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

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
    console.error("❌ Error fetching orders for delivery:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// جلب جميع الطلبات لدلفري معين الحالة الاولى
router.get("/delivery/:id/firststatus-orders-delivery", async (req, res) => {
  const deliveryId = req.params.id;

  try {
    const orders = await Order.findAll({
      where: {
        assignedDeliveryId: deliveryId,
        status: "تم الاستلام"
      },
      include: [
        {
          model: OrderStatusHistory,
          as: "statusHistory",
          where: {
            status: "مرفوض"
          },
          required: false
        },
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
        { model: User, as: "user", attributes: { exclude: ["password"] } },
        { model: User, as: "delivery", attributes: ["id", "name", "phone", "location", "createdAt"] },
        { model: DeliveryRating, as: "rating" }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedOrders = orders.map(order => {
      const items = order.items && order.items.length > 0 ? order.items : null;
      return { ...order.toJSON(), items };
    });

    res.status(200).json(formattedOrders);

  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/orders", upload.none(), async (req, res) => {
    const { address, phone, orderAmount, deliveryFee, notes, userId } = req.body;
    const nowPlus3Hours = new Date(Date.now() + 3 * 60 * 60 * 1000);

    try {
        const order = await Order.create({
            userId,
            address,
            phone,
            orderAmount,
            deliveryFee,
            notes,
            createdAt: nowPlus3Hours,
        });

        await OrderStatusHistory.create({
            orderId: order.id,
            status: order.status,
            createdAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        });
        await sendNotificationToRole("admin", "يوجد طلب جديد بانتظار المراجعة", "طلب جديد");

        res.status(201).json(order);
    } catch (err) {
        console.error("❌ Error creating order:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.put("/orders/:id/status", upload.none(), async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  try {
    const validStatuses = ["تم الاستلام", "تم التسليم", "استرجاع الطلب", "تبديل الطلب"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    if (["استرجاع الطلب", "تبديل الطلب"].includes(status)) {
      if (!note || note.trim() === "") {
        return res.status(400).json({ error: "الملاحظة مطلوبة عند استرجاع أو تبديل الطلب" });
      }
    }

    const order = await Order.findByPk(id, {
      include: [{ model: OrderStatusHistory, as: "statusHistory" }]
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // فقط نحدث الحالة الحالية
    order.status = status;
    await order.save();

    // نسجل سجل الحالة مع الملاحظة (إن وجدت)
    await OrderStatusHistory.create({
      orderId: order.id,
      status,
      note: note || null
    });

    // جلب الطلب مع السجل بعد التحديث
    const updatedOrder = await Order.findByPk(id, {
      include: [{ model: OrderStatusHistory, as: "statusHistory" }],
      order: [[{ model: OrderStatusHistory, as: "statusHistory" }, "changeDate", "ASC"]]
    });

    if (status === "تم التسليم") {
      if (order.vendorId) {
        await sendNotificationToUser(order.vendorId, `تم تسليم طلب رقم ${order.id}`, "تحديث الطلب");
      }
      await sendNotificationToUser(order.userId, "تم تسليم طلبك بنجاح", "تحديث الطلب");
    } else if (["استرجاع الطلب", "تبديل الطلب"].includes(status)) {
      if (order.vendorId) {
        await sendNotificationToUser(order.vendorId, `تم تحديث حالة طلب رقم ${order.id} إلى: ${status}`, "تحديث الطلب");
      }
      await sendNotificationToUser(order.userId, `تم تحديث حالة طلبك: ${status}`, "تحديث الطلب");
      await sendNotificationToRole("admin", `طلب رقم ${order.id} بحالة: ${status}`, "تنبيه طلب");
    }

    res.status(200).json({
      message: "تم تحديث حالة الطلب بنجاح",
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
        {
          model: OrderStatusHistory,
          as: "statusHistory",
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    // لو الطلب بدون منتجات — نرجع items: null بدل []
    const formattedOrders = orders.map(order => {
      const items = order.items.length > 0 ? order.items : null;
      return { ...order.toJSON(), items };
    });

    res.status(200).json({
      totalOrders: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      orders: formattedOrders
    });

  } catch (err) {
    console.error("❌ Error fetching user orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// إنشاء مجموعة من الطلبات من تاجر
router.post("/vendor/:vendorId/orders", upload.none(), async (req, res) => {
  const { address, phone, notes, products, userId } = req.body;
  const { vendorId } = req.params;

  try {
    // تحويل JSON string إلى Array لو جاي من form-data
    const productList = typeof products === "string" ? JSON.parse(products) : products;

    if (!productList || !productList.length) {
      return res.status(400).json({ error: "يجب تحديد منتجات للطلب" });
    }

    // التحقق من وجود كل منتج للتاجر
    const productRecords = await Product.findAll({
      where: {
        id: productList.map(p => p.productId),
        vendorId
      }
    });

    if (productRecords.length !== productList.length) {
      return res.status(404).json({ error: "بعض المنتجات غير موجودة أو لا تنتمي للتاجر" });
    }

    // حساب إجمالي السعر
    let totalAmount = 0;
    productRecords.forEach(prod => {
      const quantity = productList.find(p => p.productId == prod.id).quantity || 1;
      totalAmount += prod.price * quantity;
    });

    // إنشاء الطلب
    const order = await Order.create({
      userId,
      vendorId,
      address,
      phone,
      orderAmount: totalAmount,
      deliveryFee: 0,
      notes
    });

    // ربط المنتجات بالطلب (نفترض عندك جدول OrderItems)
    for (const p of productList) {
      await OrderItem.create({
        orderId: order.id,
        productId: p.productId,
        quantity: p.quantity || 1
      });
    }

    // حفظ الحالة الأولية
    await OrderStatusHistory.create({
      orderId: order.id,
      status: order.status
    });

    await Cart.destroy({ where: { userId } });

    res.status(201).json(order);

  } catch (err) {
    console.error("❌ Error creating multi-product order:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// جلب الطلبات الخاصة بتاجر معين (الطلبات الموجهة للتاجر أو التي أنشأها بنفسه)
router.get("/vendor/:vendorId/orders", async (req, res) => {
  const { vendorId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        [Op.or]: [
          { vendorId: vendorId }, 
          { userId: vendorId }  
        ]
      },
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
        {
          model: User,
          as: "user", 
          attributes: ["id", "name", "phone"]
        },
        {
          model: OrderStatusHistory,
          as: "statusHistory", 
          limit: 1,
          order: [["createdAt", "DESC"]]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    const formattedOrders = orders.map(order => {
      const items = order.items.length > 0 ? order.items : null;
      return { ...order.toJSON(), items };
    });

    res.status(200).json({
      totalOrders: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      orders: formattedOrders
    });

  } catch (err) {
    console.error("❌ Error fetching vendor orders:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;