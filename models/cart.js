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
}, {
  timestamps: true
});

Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(Product, { foreignKey: 'productId' });
User.hasMany(Cart, { foreignKey: 'userId' });
Product.hasMany(Cart, { foreignKey: 'productId' });

module.exports = Cart;
