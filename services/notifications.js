const axios = require('axios');
const UserDevice = require("../models/user_device");
const User = require("../models/user");


const sendNotification = (message, heading) => {
    if (!message || typeof message !== 'string' || message.trim() === '') {
        console.error('❌ message مطلوب ويجب أن يكون نصًا غير فارغ');
        return;
    }

    const url = 'https://onesignal.com/api/v1/notifications';
    const headers = {
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
    };

    const data = {
        app_id: process.env.ONESIGNAL_APP_ID,
        included_segments: ['All'],
        contents: {
            en: message,
        },
        headings: {
            en: heading ,
        },
    };

    axios.post(url, data, { headers })
        .then(response => {
            if (response.data.errors) {
                console.error('❌ Error sending notification:', response.data.errors);
            } else {
               // console.log('✅ Notification sent successfully:', response.data);
            }
        })
        .catch(error => {
            console.error('❌ Error sending notification:', error.response ? error.response.data : error.message);
        });
};

const sendNotificationToRole = async (role, message, title = "Notification") => {
  if (!message) throw new Error("message مطلوب");
  if (!role) throw new Error("role مطلوب");

  try {
    const devices = await UserDevice.findAll({
      include: [{
        model: User,
        where: { role }
      }]
    });

    const playerIds = devices.map(device => device.player_id);

    if (playerIds.length === 0) {
      console.warn(`⚠️ لا توجد أجهزة للمستخدمين برول ${role}`);
      return { success: false, message: `لا توجد أجهزة للمستخدمين برول ${role}` };
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
      headings: { en: title },
    };

    await axios.post(url, data, { headers });
    console.log(`✅ تم إرسال إشعار لـ ${role}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error sending notification to role ${role}:`, error.response ? error.response.data : error.message);
    return { success: false, error: error.message };
  }
};

const sendNotificationToNonAdmin = async (message, title = "إعلان جديد") => {
  if (!message) throw new Error("message مطلوب");

  try {
    const devices = await UserDevice.findAll({
      include: [{
        model: User,
        where: {
          role: { [require('sequelize').Op.not]: 'admin' }
        }
      }]
    });

    const playerIds = devices.map(device => device.player_id);

    if (playerIds.length === 0) {
      console.warn("⚠️ لا توجد أجهزة للمستخدمين غير الإداريين");
      return { success: false, message: "لا توجد أجهزة للمستخدمين غير الإداريين" };
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
      headings: { en: title },
    };

    await axios.post(url, data, { headers });
    console.log("✅ تم إرسال إشعار للمستخدمين غير الإداريين");
    return { success: true };

  } catch (error) {
    console.error(`❌ Error sending notification to non-admin users:`, error.response ? error.response.data : error.message);
    return { success: false, error: error.message };
  }
};


module.exports = {
  sendNotification,
  sendNotificationToRole,
  sendNotificationToNonAdmin
};
