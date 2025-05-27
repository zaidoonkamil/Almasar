const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderStatusHistory = sequelize.define("OrderStatusHistory", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    status: {
        type: DataTypes.ENUM("تم الاستلام", "تم التسليم", "استرجاع الطلب", "تبديل الطلب"),
        allowNull: false
    },
    note: {
        type: DataTypes.TEXT ,
        allowNull: true,
    },
    changeDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true  
});

module.exports = OrderStatusHistory;
