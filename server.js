const express = require("express");
const sequelize = require("./config/db");
const usersRouter = require("./routes/user");
const adsRoutes = require("./routes/ads");
const orderRoutes = require("./routes/order");
const deliveryRoutes = require("./routes/delivery");
const adminRoutes = require("./routes/admin");
const locationRoutes = require("./routes/location");
const ratingRoutes = require("./routes/delivery_rating");
const productsRoutes = require("./routes/products");
const notifications = require("./routes/notifications");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("./" + "uploads"));

sequelize.sync({ 
  // alter: true
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


app.listen(3000, () => {
    console.log("Server is running on port https://168.231.111.44:3000");
});
