const express = require('express');
const User = require('../models/user');
const bcrypt = require("bcrypt");
const saltRounds = 10;
const router = express.Router();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const multer = require("multer");
const upload = multer();

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '5d' } 
    );
};

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "Access denied, no token provided" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};

router.post("/users", upload.none() ,async (req, res) => {
    const { name, phone , location ,password , role = 'user'} = req.body;
    
    try {
        const existingUser = await User.findOne({ where: { phone } });

        if (existingUser) {
            return res.status(400).json({ error: "Phone already in use" });
        }

        if (phone.length !== 11) {
            return res.status(400).json({ error: "Phone number must be 11 digits" });
        }
    
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await User.create({ name, phone, location, password: hashedPassword, role });

        res.status(201).json({
        id: user.id,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
     });
    } catch (err) {
        console.error("❌ Error creating user:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/login", upload.none() ,async (req, res) => {
    const { phone, password } = req.body;

    try {
        const user = await User.findOne({ where: { phone } });

        if (!user) {
            return res.status(400).json({ error: "Invalid phone" });
        }

        // التحقق من صحة كلمة المرور
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid password" });
        }

        const token = generateToken(user);

        res.status(201).json({ message: "Login successful",
            user:{
            id: user.id,
            name: user.name,
            phone: user.phone,
            location: user.location,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        },
        token: token 
    });
    } catch (err) {
        console.error("❌ Error logging in:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Endpoint للحصول على جميع المستخدمين
router.get("/users", async (req, res) => {
    try {
        const users = await User.findAll(); 
        res.status(200).json(users); 
    } catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/profile", authenticateToken, async (req, res) => {
    try {
        // جلب بيانات المستخدم بناءً على الـ id الموجود في الـ token
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// للحصول على بيانات مستخدم معين
router.get("/users/:id", authenticateToken ,async (req,res)=>{
    const {id} = req.params;

    // التحقق من أن المستخدم الذي يحاول الوصول إلى البيانات هو نفس المستخدم الذي يتم جلب بياناته
    if (req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: "Access denied, you are not authorized to view this user's data" });
    }

    try{
        const user = await User.findByPk(id);
        if(!user){
            return res.status(404).json({error:"User not found"});
        }
        res.status(200).json(user);
    }catch(err){
        console.error(" Error fetching user:",err);
        res.status(500).json({error:"Internal Server Error"});
    }
    }
);

router.delete("/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await user.destroy();
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("❌ Error deleting user:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/usersDelivery", async (req, res) => {
    try {
        const deliveryUsers = await User.findAll({
            where: { role: "delivery" },
            attributes: { exclude: ['password'] },
         });

        res.status(200).json(deliveryUsers);

    } catch (err) {
        console.error("❌ Error fetching delivery users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/usersOnly", async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: "user" },
            attributes: { exclude: ['password'] },
         });

        res.status(200).json(users);

    } catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/usersAdmin", async (req, res) => {
    try {
        const adminUsers = await User.findAll({
            where: { role: "admin" },
            attributes: { exclude: ['password'] },
         });

        res.status(200).json(adminUsers);

    } catch (err) {
        console.error("❌ Error fetching admin users:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;