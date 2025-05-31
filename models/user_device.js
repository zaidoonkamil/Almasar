const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./user"); 

const UserDevice = sequelize.define("UserDevice", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    player_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: "user_devices"
});


UserDevice.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(UserDevice, { foreignKey: "user_id" });

module.exports = UserDevice;
