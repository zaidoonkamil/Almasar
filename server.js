const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const sequelize = require("./config/db");
const Governorate = require("./models/governorate");
const usersRouter = require("./routes/user");
const adsRoutes = require("./routes/ads");
const orderRoutes = require("./routes/order");
const deliveryRoutes = require("./routes/delivery");
const adminRoutes = require("./routes/admin");
const locationRoutes = require("./routes/location");
const ratingRoutes = require("./routes/delivery_rating");
const productsRoutes = require("./routes/products");
const notifications = require("./routes/notifications");
const chatRoutes = require("./routes/chat");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("./" + "uploads"));

sequelize.sync({ 
    alter: true
    // force: false 
}) .then(() => console.log("✅ Database & User table synced!"))
    .catch(err => console.error("❌ Error syncing database:", err));


app.use("/", usersRouter);
app.use("/", adsRoutes);
app.use("/", orderRoutes);
app.use("/", deliveryRoutes);
app.use("/", adminRoutes);
app.use("/", locationRoutes);
app.use("/", ratingRoutes);
app.use("/", productsRoutes);
app.use("/", notifications);
app.use("/", chatRoutes);


io.on("connection", (socket) => {
    console.log("🔌 Client connected to Socket.io:", socket.id);

    socket.on("join_room", ({ orderId, userId1, userId2 }) => {
        if (!orderId || !userId1 || !userId2) return;
        const roomName = `room_${orderId}_${Math.min(userId1, userId2)}_${Math.max(userId1, userId2)}`;
        socket.join(roomName);
        console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on("disconnect", () => {
        console.log("🔌 Socket client disconnected:", socket.id);
    });
});

server.listen(1010, () => {
    console.log("Server is running on port https://168.231.111.44:1010");
});
