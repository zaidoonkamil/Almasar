const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // استخراج التوكن من الهيدر

    if (!token) {
        return res.status(401).json({ error: "Token not provided. Unauthorized access." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token" });
        }
        req.user = user; // إضافة معلومات المستخدم إلى الـ request
        next(); // الانتقال إلى الـ route التالي
    });
};

module.exports = { authenticateToken };
