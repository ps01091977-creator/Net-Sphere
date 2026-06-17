const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");

// Send a message
router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, content, media, initiatedFromProfile } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender and receiver IDs are required" });
    }

    if (!content && (!media || !media.url)) {
      return res.status(400).json({ message: "Message content or media is required" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      content: content || "",
      media: media || undefined,
      initiatedFromProfile: !!initiatedFromProfile,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get conversations for a user
// Restricted to threads where contact was initiated from a profile page (either by the user or to the user)
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all messages involving the user that were initiated from a profile
    const profileInitiatedMessages = await Message.find({
      $or: [
        { receiverId: userId, initiatedFromProfile: true },
        { senderId: userId, initiatedFromProfile: true },
      ],
    });

    // Extract unique partner IDs
    const partnerIds = [
      ...new Set(
        profileInitiatedMessages.map((msg) =>
          msg.senderId === userId ? msg.receiverId : msg.senderId
        )
      ),
    ];

    if (partnerIds.length === 0) {
      return res.json([]);
    }

    // Fetch details of those users
    const otherUsers = await User.find({ firebaseUid: { $in: partnerIds } })
      .select("firebaseUid name headline profilePicture");

    const conversations = [];

    // For each sender, retrieve the last message (either direction) to display in the conversation list
    for (const otherUser of otherUsers) {
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: userId, receiverId: otherUser.firebaseUid },
          { senderId: otherUser.firebaseUid, receiverId: userId },
        ],
      }).sort({ createdAt: -1 });

      if (lastMessage) {
        conversations.push({
          otherUser,
          lastMessage,
        });
      }
    }

    // Sort conversations by the last message timestamp descending
    conversations.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get message thread between two users
router.get("/thread/:userId/:otherId", async (req, res) => {
  try {
    const { userId, otherId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 }); // Sort chronologically

    res.json(messages);
  } catch (error) {
    console.error("Error fetching message thread:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
