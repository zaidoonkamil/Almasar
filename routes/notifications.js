require('dotenv').config();
const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notifications');
const multer = require("multer");
const upload = multer();
const UserDevice = require("../models/user_device");
const User = require("../models/user");
const axios = require('axios');


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

router.post('/send-notification-to-role', upload.none(), async (req, res) => {
  const { title, message, role } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message مطلوب' });
  }

  if (!role) {
    return res.status(400).json({ error: 'role مطلوب' });
  }

  try {
    // جلب الأجهزة المرتبطة بالمستخدمين حسب الدور المطلوب
    const devices = await UserDevice.findAll({
      include: [{
        model: User,
        where: { role: role }
      }]
    });

    const playerIds = devices.map(device => device.player_id);

    if (playerIds.length === 0) {
      return res.status(404).json({ error: `لا توجد أجهزة للمستخدمين برول ${role}` });
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
      headings: { en: title || "Notification" },
    };

    await axios.post(url, data, { headers });

    return res.json({ success: true, message: `تم إرسال الإشعار لجميع المستخدمين برول ${role}` });

  } catch (error) {
    console.error(`❌ Error sending notification to role ${role}:`, error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإشعار' });
  }
});


router.get('/notification/:userId', async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;  
  const limit = parseInt(req.query.limit) || 10; 
  const offset = (page - 1) * limit;            

  try {
    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        perPage: limit
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "خطأ أثناء جلب الإشعارات" });
  }
});



module.exports = router;
