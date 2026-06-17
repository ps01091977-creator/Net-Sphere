const express = require("express");
const router = express.Router();
const Connection = require("../models/Connection");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Send connection request
router.post("/request", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender and receiver IDs are required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot connect with yourself" });
    }

    // Check if other user already sent a request to us
    const incomingRequest = await Connection.findOne({
      senderId: receiverId,
      receiverId: senderId,
    });

    if (incomingRequest) {
      if (incomingRequest.status === "pending") {
        // Auto accept request
        incomingRequest.status = "accepted";
        await incomingRequest.save();

        // Create notification for the other user
        const acceptor = await User.findOne({ firebaseUid: senderId });
        const notification = new Notification({
          userId: receiverId,
          senderId: senderId,
          senderName: acceptor?.name || "Someone",
          senderAvatar: acceptor?.profilePicture || "",
          type: "connection_accepted",
          message: `${acceptor?.name || "Someone"} accepted your connection request.`,
        });
        await notification.save();

        return res.json({ message: "Connection accepted automatically", status: "accepted" });
      } else if (incomingRequest.status === "accepted") {
        return res.status(400).json({ message: "Already connected", status: "accepted" });
      }
    }

    // Check if we already sent a request
    const existingRequest = await Connection.findOne({
      senderId,
      receiverId,
    });

    if (existingRequest) {
      return res.json({ message: "Request already exists", status: existingRequest.status });
    }

    // Create a new request
    const newConnection = new Connection({
      senderId,
      receiverId,
      status: "pending",
    });

    await newConnection.save();

    // Create notification for receiver
    const sender = await User.findOne({ firebaseUid: senderId });
    const notification = new Notification({
      userId: receiverId,
      senderId,
      senderName: sender?.name || "Someone",
      senderAvatar: sender?.profilePicture || "",
      type: "connection_request",
      message: `${sender?.name || "Someone"} sent you a connection request.`,
    });
    await notification.save();

    res.status(201).json({ message: "Connection request sent", status: "pending" });
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Accept connection request
router.post("/accept", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body; // senderId is the one who originally sent, receiverId is the current user accepting

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender and receiver IDs are required" });
    }

    const connection = await Connection.findOne({ senderId, receiverId, status: "pending" });

    if (!connection) {
      return res.status(404).json({ message: "Pending connection request not found" });
    }

    connection.status = "accepted";
    await connection.save();

    // Create notification for the original sender
    const receiver = await User.findOne({ firebaseUid: receiverId });
    const notification = new Notification({
      userId: senderId,
      senderId: receiverId,
      senderName: receiver?.name || "Someone",
      senderAvatar: receiver?.profilePicture || "",
      type: "connection_accepted",
      message: `${receiver?.name || "Someone"} accepted your connection request.`,
    });
    await notification.save();

    res.json({ message: "Connection request accepted", status: "accepted" });
  } catch (error) {
    console.error("Error accepting connection request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reject/Cancel connection request
router.post("/reject", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender and receiver IDs are required" });
    }

    // Check if there was a pending connection from senderId to receiverId
    const pendingConnection = await Connection.findOne({ senderId, receiverId, status: "pending" });

    // Find and delete the request in either direction
    const result = await Connection.findOneAndDelete({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (!result) {
      return res.status(404).json({ message: "Connection request or relationship not found" });
    }

    // Send notification if a pending request from senderId was rejected by receiverId
    if (pendingConnection) {
      try {
        const decliningUser = await User.findOne({ firebaseUid: receiverId });
        const notification = new Notification({
          userId: senderId,
          senderId: receiverId,
          senderName: decliningUser?.name || "Someone",
          senderAvatar: decliningUser?.profilePicture || "",
          type: "connection_rejected",
          message: `${decliningUser?.name || "Someone"} declined your connection request.`,
        });
        await notification.save();
      } catch (notifErr) {
        console.error("Error creating connection rejection notification:", notifErr);
      }
    }

    res.json({ message: "Connection relationship removed/ignored successfully" });
  } catch (error) {
    console.error("Error rejecting connection request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get pending requests for a user
router.get("/pending/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get requests where status is pending and user is receiver
    const pendingRequests = await Connection.find({
      receiverId: userId,
      status: "pending",
    });

    const senderIds = pendingRequests.map((req) => req.senderId);

    // Fetch details of senders
    const senders = await User.find({ firebaseUid: { $in: senderIds } })
      .select("firebaseUid name headline profilePicture bio");

    res.json(senders);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get accepted connections list for a user
router.get("/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const connections = await Connection.find({
      $or: [
        { senderId: userId, status: "accepted" },
        { receiverId: userId, status: "accepted" },
      ],
    });

    const friendIds = connections.map((conn) =>
      conn.senderId === userId ? conn.receiverId : conn.senderId
    );

    const friends = await User.find({ firebaseUid: { $in: friendIds } })
      .select("firebaseUid name headline profilePicture bio");

    res.json(friends);
  } catch (error) {
    console.error("Error fetching connections list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get connection status between two users
router.get("/status/:userId/:otherId", async (req, res) => {
  try {
    const { userId, otherId } = req.params;

    const connection = await Connection.findOne({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    });

    if (!connection) {
      return res.json({ status: "none" });
    }

    if (connection.status === "accepted") {
      return res.json({ status: "accepted" });
    }

    if (connection.status === "pending") {
      if (connection.senderId === userId) {
        return res.json({ status: "pending_sent" });
      } else {
        return res.json({ status: "pending_received" });
      }
    }

    res.json({ status: "none" });
  } catch (error) {
    console.error("Error checking connection status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get suggestions of users not connected to current user
router.get("/suggestions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all relationships/requests containing the user
    const relationships = await Connection.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const acceptedUserIds = relationships
      .filter((rel) => rel.status === "accepted")
      .map((rel) => (rel.senderId === userId ? rel.receiverId : rel.senderId));

    const pendingSenderIds = relationships
      .filter((rel) => rel.status === "pending" && rel.senderId === userId)
      .map((rel) => rel.receiverId);

    const pendingReceiverIds = relationships
      .filter((rel) => rel.status === "pending" && rel.receiverId === userId)
      .map((rel) => rel.senderId);

    // Find all users except current user and accepted connections
    const users = await User.find({
      firebaseUid: { $nin: [...acceptedUserIds, userId] },
    }).select("firebaseUid name headline profilePicture bio");

    // Map users to include their connection status
    const suggestions = users.map((u) => {
      let status = "none";
      if (pendingSenderIds.includes(u.firebaseUid)) {
        status = "pending";
      } else if (pendingReceiverIds.includes(u.firebaseUid)) {
        status = "incoming";
      }
      return {
        ...u.toObject(),
        status,
      };
    });

    res.json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
