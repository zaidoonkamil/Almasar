require('dotenv').config();
const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notifications');
const multer = require("multer");
const upload = multer();
const UserDevice = require("../models/user_device");
const User = require("../models/user");


router.post("/register-device", async (req, res) => {
    const { user_id, player_id } = req.body;

    if (!user_id || !player_id) {
        return res.status(400).json({ error: "user_id و player_id مطلوبان" });
    }

    try {
        let device = await UserDevice.findOne({ where: { player_id } });

        if (device) {
            device.user_id = user_id;
            await device.save();
        } else {
            await UserDevice.create({ user_id, player_id });
        }

        res.json({ success: true, message: "تم تسجيل الجهاز بنجاح" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "حدث خطأ أثناء تسجيل الجهاز" });
    }
});

router.post('/send-notification', upload.none(), (req, res) => {
    const { title, message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message مطلوب' });
    }

    sendNotification(message, title);

    res.json({ success: true, message: '✅ Notification sent to all devices!' });
});


const sendNotificationToDelivery = async (message, heading) => {
    if (!message || typeof message !== 'string' || message.trim() === '') {
        console.error('❌ message مطلوب ويجب أن يكون نصًا غير فارغ');
        return;
    }

    try {
        const devices = await UserDevice.findAll({
            include: [{
                model: User,
                where: { role: 'delivery' }
            }]
        });

        const playerIds = devices.map(device => device.player_id);

        if (playerIds.length === 0) {
            console.log("لا توجد أجهزة للدليفري");
            return;
        }

        const url = 'https://onesignal.com/api/v1/notifications';
        const headers = {
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
            'Content-Type': 'application/json',
        };

        const data = {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            contents: { en: message },
            headings: { en: heading },
        };

        await axios.post(url, data, { headers });
        console.log('✅ Notification sent successfully to delivery devices.');

    } catch (error) {
        console.error('❌ Error sending notification to delivery:', error.response ? error.response.data : error.message);
    }
};


module.exports = { sendNotification, sendNotificationToDelivery };