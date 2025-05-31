const axios = require('axios');

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
                console.log('✅ Notification sent successfully:', response.data);
            }
        })
        .catch(error => {
            console.error('❌ Error sending notification:', error.response ? error.response.data : error.message);
        });
};

module.exports = {sendNotification};
