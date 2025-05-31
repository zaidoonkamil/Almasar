require('dotenv').config();
const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notifications');
const multer = require("multer");
const upload = multer();


router.post('/send-notification', upload.none(), (req, res) => {
    const { title, message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message مطلوب' });
    }

    sendNotification(message, title);

    res.json({ success: true, message: '✅ Notification sent to all devices!' });
});


module.exports = router;