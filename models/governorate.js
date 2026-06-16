const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Governorate = sequelize.define("Governorate", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    timestamps: true,
});

// Seed default governorate if database is empty
Governorate.afterSync(async () => {
    try {
        const count = await Governorate.count();
        if (count === 0) {
            await Governorate.create({ name: "صلاح الدين", isActive: true });
            console.log("🌱 Seeded default Governorate: صلاح الدين");
        }
    } catch (err) {
        console.error("❌ Error seeding Governorates:", err);
    }
});

module.exports = Governorate;
