const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Connection = require("../models/Connection");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");

// Get all posts or posts by user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { authorId: userId } : {};

    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(50);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search posts by content
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    // console.log("Post search query:", q); // Debug log

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = q.trim();
    // console.log("Searching for posts with content containing:", searchQuery);

    // Search posts by content (case-insensitive)
    const posts = await Post.find({
      content: { $regex: searchQuery, $options: "i" },
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // console.log(`Found ${posts.length} posts`);
    res.json(posts);
  } catch (error) {
    console.error("Error searching posts:", error);
    res.status(500).json({ message: "Failed to search posts" });
  }
});

// Get single post by postId
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findOne({ postId });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// Create a new post
router.post("/", async (req, res) => {
  try {
    const { content, authorId, authorName, media } = req.body;

    if (!content || !authorId || !authorName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate unique postId
    const postId = uuidv4();

    const post = new Post({
      content,
      authorId,
      authorName,
      postId,
      media: media || [],
      likes: [],
      comments: [],
      shares: [],
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    });

    await post.save();

    // Trigger notifications for connections in the background
    try {
      const author = await User.findOne({ firebaseUid: authorId });
      const avatarUrl = author?.profilePicture || "";
      
      const connections = await Connection.find({
        $or: [
          { senderId: authorId, status: "accepted" },
          { receiverId: authorId, status: "accepted" },
        ],
      });

      const friendIds = connections.map((conn) =>
        conn.senderId === authorId ? conn.receiverId : conn.senderId
      );

      if (friendIds.length > 0) {
        const notifications = friendIds.map((friendId) => ({
          userId: friendId,
          senderId: authorId,
          senderName: authorName,
          senderAvatar: avatarUrl,
          type: "post",
          postId: postId,
          postContent: content.substring(0, 50),
          message: `${authorName} uploaded a new post.`,
        }));

        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error("Error creating new post notifications:", notifErr);
    }

    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Like/Unlike post
router.post("/:postId/like", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userName } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ message: "Missing user information" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already liked the post
    const existingLikeIndex = post.likes.findIndex(
      (like) => like.userId === userId
    );

    let liked = false;
    if (existingLikeIndex > -1) {
      // Unlike the post
      post.likes.splice(existingLikeIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      // Like the post
      post.likes.push({
        userId,
        userName,
        timestamp: new Date(),
      });
      post.likeCount += 1;
      liked = true;
    }

    await post.save();

    // Trigger like notification
    if (liked && post.authorId !== userId) {
      try {
        const liker = await User.findOne({ firebaseUid: userId });
        const avatarUrl = liker?.profilePicture || "";
        
        const notification = new Notification({
          userId: post.authorId,
          senderId: userId,
          senderName: userName,
          senderAvatar: avatarUrl,
          type: "like",
          postId: postId,
          postContent: post.content.substring(0, 50),
          message: `${userName} liked your post.`,
        });
        await notification.save();
      } catch (notifErr) {
        console.error("Error creating like notification:", notifErr);
      }
    }

    res.json({
      liked,
      likeCount: post.likeCount,
      likes: post.likes,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

// Add comment to post
router.post("/:postId/comment", async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, authorId, authorName, authorAvatar } = req.body;

    if (!content || !authorId || !authorName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = {
      content,
      authorId,
      authorName,
      authorAvatar,
    };

    post.comments.push(newComment);
    post.commentCount += 1;
    await post.save();

    // Trigger comment notification
    if (post.authorId !== authorId) {
      try {
        const notification = new Notification({
          userId: post.authorId,
          senderId: authorId,
          senderName: authorName,
          senderAvatar: authorAvatar || "",
          type: "comment",
          postId: postId,
          postContent: post.content.substring(0, 50),
          message: `${authorName} commented on your post.`,
        });
        await notification.save();
      } catch (notifErr) {
        console.error("Error creating comment notification:", notifErr);
      }
    }

    // Return the newly added comment with its ID
    const addedComment = post.comments[post.comments.length - 1];
    res.status(201).json({
      comment: addedComment,
      commentCount: post.commentCount,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// Delete comment
router.delete("/:postId/comment/:commentId", async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user owns the comment or the post
    const comment = post.comments[commentIndex];
    if (comment.authorId !== userId && post.authorId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    post.comments.splice(commentIndex, 1);
    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();

    res.json({ commentCount: post.commentCount });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

// Add reply to comment
router.post("/:postId/comment/:commentId/reply", async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content, authorId, authorName, authorAvatar } = req.body;

    if (!content || !authorId || !authorName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const newReply = {
      content,
      authorId,
      authorName,
      authorAvatar,
    };

    comment.replies.push(newReply);
    await post.save();

    // Trigger notification for comment author (unless they replied to their own comment)
    if (comment.authorId !== authorId) {
      try {
        const notification = new Notification({
          userId: comment.authorId,
          senderId: authorId,
          senderName: authorName,
          senderAvatar: authorAvatar || "",
          type: "comment",
          postId: postId,
          postContent: comment.content.substring(0, 50),
          message: `${authorName} replied to your comment.`,
        });
        await notification.save();
      } catch (notifErr) {
        console.error("Error creating reply notification:", notifErr);
      }
    }

    res.status(201).json(post.comments);
  } catch (error) {
    console.error("Error adding comment reply:", error);
    res.status(500).json({ message: "Failed to add reply" });
  }
});

// Share post
router.post("/:postId/share", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userName } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ message: "Missing user information" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already shared the post
    const existingShareIndex = post.shares.findIndex(
      (share) => share.userId === userId
    );

    if (existingShareIndex === -1) {
      // Add share
      post.shares.push({
        userId,
        userName,
        timestamp: new Date(),
      });
      post.shareCount += 1;
      await post.save();
    }

    // Generate shareable URL
    const shareUrl = `${req.protocol}://${req.get("host")}/post/${postId}`;

    res.json({
      shared: true,
      shareCount: post.shareCount,
      shareUrl,
    });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({ message: "Failed to share post" });
  }
});

// Get post likes
router.get("/:postId/likes", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findOne({ postId });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post.likes);
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});

// Get post comments
router.get("/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findOne({ postId });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post.comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// Update/Edit a post
router.put("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user owns the post
    if (post.authorId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    post.content = content.trim();
    post.updatedAt = new Date();
    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Failed to update post" });
  }
});

// Delete a post by postId
router.delete("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user owns the post
    if (post.authorId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

module.exports = router;
