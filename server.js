const express = require("express");
const sequelize = require("./config/db");
const usersRouter = require("./routes/user");
const adsRoutes = require("./routes/ads");
const orderRoutes = require("./routes/order");
const deliveryRoutes = require("./routes/delivery");
const adminRoutes = require("./routes/admin");
const locationRoutes = require("./routes/location");
const ratingRoutes = require("./routes/delivery_rating");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();

const server = https.createServer({
key: fs.readFileSync("/etc/letsencrypt/live/backendalmasar.khayrat-alrahman.com/privkey.pem"),
cert: fs.readFileSync("/etc/letsencrypt/live/backendalmasar.khayrat-alrahman.com/fullchain.pem"),
}, app);

const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("./" + "uploads"));

sequelize.sync({ force: false })
    .then(() => console.log("✅ Database & User table synced!"))
    .catch(err => console.error("❌ Error syncing database:", err));


app.use("/", usersRouter);
app.use("/", adsRoutes);
app.use("/", orderRoutes);
app.use("/", deliveryRoutes);
app.use("/", adminRoutes);
app.use("/", locationRoutes);
app.use("/", ratingRoutes);


io.on("connection", (socket) => {
  console.log("✔️ Client connected:", socket.id);

  // الحصول على الـ deliveryId من query عند الاتصال
  const deliveryId = socket.handshake.query.deliveryId;

  if (deliveryId) {
    socket.join(`deliveryRoom_${deliveryId}`);
    console.log(`Socket ${socket.id} joined room deliveryRoom_${deliveryId}`);

    // أرسل بيانات الطلبات لأول مرة عند الاتصال مثلاً:
    Order.findAll({
      where: {
        assignedDeliveryId: deliveryId,
        status: "تم الاستلام"
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "location"]
        },
        {
          model: OrderStatusHistory,
          as: "statusHistory"
        }
      ]
    }).then(orders => {
      socket.emit(`deliveryOrders_${deliveryId}`, orders);
    }).catch(err => {
      console.error("Error fetching orders:", err);
    });

  } else {
    console.warn("No deliveryId provided by socket client");
  }
});



server.listen(3000, () => {
    console.log("Server is running on port https://168.231.111.44:3000");
});

//ws://168.231.111.44:3000/socket.io/?EIO=4&transport=websocket