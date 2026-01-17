const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const Cart = require("../models/cart");
const User = require("../models/user");
const upload = require("../middlewares/uploads");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

// إضافة منتج جديد
router.post("/vendor/:vendorId/products",upload.array("images",5), async (req, res) => {
  const nowPlus3Hours = new Date(Date.now() + 3 * 60 * 60 * 1000);
  try {
    const { title, description, price } = req.body;
    const images = req.files.map(file => file.filename);
    const { vendorId } = req.params;

    const product = await Product.create({
      title,
      description,
      price,
      images,
      vendorId,
      createdAt: nowPlus3Hours,
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error creating product", error: err });
  }
});

// عرض منتجات التاجر
router.get("/vendor/:vendorId/products", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 60; 
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { vendorId },
      limit,
      offset
    });

    res.json({
      totalProducts: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      products: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products", error: err });
  }
});

// البحث عن منتج لدى تاجر معين
router.get("/vendor/:vendorId/products/search", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { title, page = 1, limit = 60 } = req.query;

    if (!title) {
      return res.status(400).json({ message: "يرجى إدخال كلمة البحث" });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: {
        vendorId,
        title: {
          [Op.like]: `%${title}%`
        }
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      totalProducts: count,
      totalPages: totalPages,
      currentPage: parseInt(page),
      products: rows
    });

  } catch (err) {
    console.error("Error searching vendor products:", err);
    res.status(500).json({ message: "حدث خطأ أثناء البحث", error: err });
  }
});


// حذف منتج معين لتاجر معين
router.delete("/vendor/:vendorId/products/:productId", async (req, res) => {
  try {
    const { vendorId, productId } = req.params;

    const product = await Product.findOne({ where: { id: productId, vendorId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.destroy();
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting product", error: err });
  }
});

// عرض التجار حسب الافضلية
router.get("/vendorbysponsored", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // التجار الموصى بهم (اللي عندهم قيمة > 0)
    const sponsoredVendors = await User.findAll({
      where: {
        role: "vendor",
        sponsorshipAmount: { [Op.gt]: 0 }
      },
      attributes: { exclude: ['password'] },
      order: [["sponsorshipAmount", "DESC"]]
    });

    // باقي التجار (عشوائيين)
    const randomVendors = await User.findAll({
      where: {
        role: "vendor",
        sponsorshipAmount: 0
      },
      attributes: { exclude: ['password'] },
      order: sequelize.literal('RAND()')
    });

    // دمج الاثنين
    const allVendors = [...sponsoredVendors, ...randomVendors];

    // باجنيشن يدوي
    const paginatedVendors = allVendors.slice(offset, offset + limit);

    res.status(200).json({
      data: paginatedVendors,
      pagination: {
        totalItems: allVendors.length,
        totalPages: Math.ceil(allVendors.length / limit),
        currentPage: page
      }
    });

  } catch (err) {
    console.error("❌ Error fetching vendor users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// تعديل مبلغ الرعاية (sponsorshipAmount) لتاجر معين
router.put("/vendor/:vendorId/sponsorship", upload.none(), async (req, res) => {
  try {
    const { vendorId } = req.params;
    let { sponsorshipAmount } = req.body;

    // تحويل القيمة إلى رقم
    sponsorshipAmount = Number(sponsorshipAmount);

    // تأكيد أن المبلغ رقم صالح (ليس NaN)
    if (isNaN(sponsorshipAmount)) {
      return res.status(400).json({ error: "sponsorshipAmount يجب أن يكون رقمًا" });
    }

    // جلب التاجر
    const vendor = await User.findOne({ where: { id: vendorId, role: "vendor" } });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // تحديث مبلغ الرعاية
    vendor.sponsorshipAmount = sponsorshipAmount;
    await vendor.save();

    res.status(200).json({ message: "تم تحديث مبلغ الرعاية بنجاح", vendor });

  } catch (err) {
    console.error("❌ Error updating sponsorship amount:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/cart", upload.none(), async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    const existingItem = await Cart.findOne({
      where: { userId, productId },
    });

    const cartItems = await Cart.findAll({
      where: { userId },
      include: {
        model: Product,
        as: 'product',
        attributes: ['id', 'vendorId']
      }
    });

    if (cartItems.length > 0) {
      const vendorIdInCart = cartItems[0].product.vendorId;

      if (vendorIdInCart !== product.vendorId) {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات من تجار مختلفين في نفس السلة" });
      }
    }

    if (existingItem) {
      existingItem.quantity = quantity || 1;
      await existingItem.save();
      return res.status(200).json({ message: "تم تحديث الكمية", item: existingItem });
    }

    const newCartItem = await Cart.create({
      userId,
      productId,
      quantity: quantity || 1
    });

    res.status(201).json({
    message: "تم اضافة المنتج بنجاح",
    item: newCartItem
    });

  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: "خطأ أثناء الإضافة للسلة" });
  }
});

router.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const cartItems = await Cart.findAll({
      where: { userId },
      include: {
        model: Product,
        as: 'product' ,
      }
    });

    const fixedCartItems = cartItems.map(item => {
  const json = item.toJSON();
  if (json.product) {
    json.Product = json.product;
    delete json.product;
  }
  return json;
});


    res.status(200).json(fixedCartItems);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "خطأ أثناء جلب السلة" });
  }
});

router.delete("/cart/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;

    const deleted = await Cart.destroy({ where: { id: cartItemId } });

    if (!deleted) {
      return res.status(404).json({ error: "العنصر غير موجود" });
    }

    res.status(200).json({ message: "تم الحذف من السلة" });
  } catch (err) {
    console.error("Error deleting cart item:", err);
    res.status(500).json({ error: "خطأ أثناء الحذف من السلة" });
  }
});


module.exports = router;
