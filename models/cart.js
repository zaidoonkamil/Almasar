const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./user");
const Product = require("./product");

const Cart = sequelize.define("cart", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
   quantity: {
    type: DataTypes.INTEGER,
      allowNull: false,
     defaultValue: 1,
  }
}, {
  timestamps: true
});


module.exports = Cart;
