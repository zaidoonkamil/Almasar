const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    vendorId: {
       type: DataTypes.INTEGER,
       allowNull: true 
    },
     productId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
    assignedDeliveryId: {      
        type: DataTypes.INTEGER,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    orderAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    deliveryFee: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM("تم الاستلام", "تم التسليم", "استرجاع الطلب", "تبديل الطلب"),
        allowNull: false,
        defaultValue: "تم الاستلام"
    },
    isAccepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: null
    },
    rejectionReason: {
       type: DataTypes.TEXT,
       allowNull: true
    },
    
}, {
    timestamps: true,
});

module.exports = Order;