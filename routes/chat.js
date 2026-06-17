const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { ChatMessage, Order, User } = require("../middlewares/associations");
const { authenticateToken } = require("../middlewares/auth");

// Helper to validate if two users are allowed to chat in the context of an order
async function isValidChatPair(order, user1Id, user2Id) {
    const user1 = await User.findByPk(user1Id);
    const user2 = await User.findByPk(user2Id);
    if (!user1 || !user2) return false;

    const role1 = user1.role;
    const role2 = user2.role;

    // Admin can chat with any valid participant of the order
    if (role1 === "admin" || role2 === "admin") {
        const nonAdminId = role1 === "admin" ? user2Id : user1Id;
        return (
            nonAdminId === order.userId ||
            nonAdminId === order.vendorId ||
            nonAdminId === order.assignedDeliveryId
        );
    }

    // Customer <-> Delivery
    if ((user1Id === order.userId && user2Id === order.assignedDeliveryId) ||
        (user2Id === order.userId && user1Id === order.assignedDeliveryId)) {
        return order.assignedDeliveryId !== null;
    }

    // Vendor <-> Delivery
    if ((user1Id === order.vendorId && user2Id === order.assignedDeliveryId) ||
        (user2Id === order.vendorId && user1Id === order.assignedDeliveryId)) {
        return order.assignedDeliveryId !== null;
    }

    return false;
}

// 1. Fetch chat history for an order between two users
router.get("/chat/history/:orderId", authenticateToken, async (req, res) => {
    const { orderId } = req.params;
    const { user1Id, user2Id } = req.query;

    if (!user1Id || !user2Id) {
        return res.status(400).json({ error: "user1Id and user2Id parameters are required" });
    }

    const u1 = parseInt(user1Id);
    const u2 = parseInt(user2Id);

    // Requester must be one of the participants OR an admin
    if (req.user.id !== u1 && req.user.id !== u2 && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const valid = await isValidChatPair(order, u1, u2);
        if (!valid) {
            return res.status(400).json({ error: "Invalid conversation participants for this order" });
        }

        const messages = await ChatMessage.findAll({
            where: {
                orderId,
                [Op.or]: [
                    { senderId: u1, receiverId: u2 },
                    { senderId: u2, receiverId: u1 }
                ]
            },
            order: [["createdAt", "ASC"]],
            include: [
                { model: User, as: "sender", attributes: ["id", "name", "role", "images"] },
                { model: User, as: "receiver", attributes: ["id", "name", "role", "images"] }
            ]
        });

        res.status(200).json(messages);
    } catch (err) {
        console.error("❌ Error fetching chat history:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 2. Send a new message
router.post("/chat/message", authenticateToken, async (req, res) => {
    const { orderId, receiverId, messageText } = req.body;
    const senderId = req.user.id;

    if (!orderId || !receiverId || !messageText || !messageText.trim()) {
        return res.status(400).json({ error: "orderId, receiverId, and messageText are required" });
    }

    try {
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Validate active order status - cannot chat on completed orders
        const closedStatuses = ["تم التسليم", "استرجاع الطلب", "تبديل الطلب"];
        if (closedStatuses.includes(order.status)) {
            return res.status(400).json({ error: "الدردشة مغلقة لأن الطلب مكتمل أو ملغى" });
        }

        // Validate chat pair
        const valid = await isValidChatPair(order, senderId, receiverId);
        if (!valid) {
            return res.status(400).json({ error: "Invalid conversation participants for this order" });
        }

        const newMessage = await ChatMessage.create({
            orderId,
            senderId,
            receiverId,
            messageText: messageText.trim()
        });

        // Fetch user detail for realtime broadcast
        const fullMessage = await ChatMessage.findByPk(newMessage.id, {
            include: [
                { model: User, as: "sender", attributes: ["id", "name", "role", "images"] },
                { model: User, as: "receiver", attributes: ["id", "name", "role", "images"] }
            ]
        });

        // Broadcast to socket room if attached
        const io = req.app.get("io");
        if (io) {
            const roomName = `room_${orderId}_${Math.min(senderId, receiverId)}_${Math.max(senderId, receiverId)}`;
            io.to(roomName).emit("new_message", fullMessage.toJSON());
        }

        res.status(201).json(fullMessage);
    } catch (err) {
        console.error("❌ Error sending chat message:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 3. Mark messages as read
router.put("/chat/read", authenticateToken, async (req, res) => {
    const { orderId, senderId } = req.body;
    const receiverId = req.user.id;

    if (!orderId || !senderId) {
        return res.status(400).json({ error: "orderId and senderId are required" });
    }

    try {
        await ChatMessage.update(
            { isRead: true },
            {
                where: {
                    orderId,
                    senderId,
                    receiverId,
                    isRead: false
                }
            }
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (err) {
        console.error("❌ Error marking messages as read:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
