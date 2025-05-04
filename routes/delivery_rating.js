const express = require("express");
const router = express.Router();
const DeliveryRating  = require("../models/delivery_rating");
const multer = require("multer");
const upload = multer();

router.post("/delivery-rating", upload.none(), async (req, res) => {
    const { deliveryId, userId, orderId, rating, comment } = req.body;
  
    if (!deliveryId || !userId || !orderId || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const newRating = await DeliveryRating.create({
        deliveryId,
        userId,
        orderId,
        rating,
        comment
      });
  
      res.status(201).json({
        message: "Rating submitted successfully",
        rating: newRating
      });
  
    } catch (err) {
      console.error("❌ Error submitting rating:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;