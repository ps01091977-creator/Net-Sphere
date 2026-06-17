const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Get notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark all notifications as read for a user
router.put("/:userId/read", async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error updating notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
