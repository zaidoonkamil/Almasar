require('dotenv').config();
const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notifications');

router.post('/send-notification', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message مطلوب' });
    }

    sendNotification(message);

    res.json({ success: true, message: '✅ Notification sent to all devices!' });
});


module.exports = router;