const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sponsorshipAmount: {
     type: DataTypes.FLOAT,
     defaultValue: 0 
    },
    role: {
        type: DataTypes.ENUM("user",  "vendor", "admin", "delivery"), 
        allowNull: false,
        defaultValue: "user",
    }
}, {
    timestamps: true,
});


module.exports = User;