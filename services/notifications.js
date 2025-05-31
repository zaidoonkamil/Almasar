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

module.exports = {sendNotification, sendNotificationToDelivery};
