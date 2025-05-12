const express = require("express");
const router = express.Router();
const Location  = require("../models/location");
const multer = require("multer");
const upload = multer();


router.post("/delivery-locations", upload.none(), async (req, res) => {
  const { deliveryId, latitude, longitude } = req.body;

  if (!deliveryId || !latitude || !longitude) {
    return res.status(400).json({ error: "deliveryId, latitude and longitude are required" });
  }

  try {

    await Location.destroy({
      where: { deliveryId }
    });

    const location = await Location.create({
      deliveryId,
      latitude,
      longitude
    });

    res.status(201).json({
      message: "Location stored successfully",
      location
    });

  } catch (err) {
    console.error("❌ Error storing location:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/delivery-locations/:deliveryId", async (req, res) => {
  const deliveryId = req.params.deliveryId;

  try {
    const locations = await Location.findAll({
      where: { deliveryId },
      order: [["createdAt", "DESC"]]
    });

    res.status(200).json(locations);

  } catch (err) {
    console.error("❌ Error fetching locations:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;