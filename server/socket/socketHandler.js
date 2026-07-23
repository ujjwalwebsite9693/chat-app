const { verifyToken } = require("../middleware/auth");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { REPLY_POPULATE } = require("../controllers/messageController");

// Tracks which socket ids belong to which user, so we know when a user
// has truly gone offline (closed every tab/connection) vs. just one socket.
const userSockets = new Map(); // userId -> Set<socketId>

async function populateMessage(message) {
  return message.populate([
    { path: "sender", select: "username avatarColor avatarUrl" },
    REPLY_POPULATE,
  ]);
}

function initSocket(io) {
  // Authenticate every socket connection using the JWT issued at login
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket;

    // Track this socket against the user
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Join a personal room so we can push updates (new conversations, etc.)
    // to every device/tab a user has open
    socket.join(`user:${userId}`);

    // Mark the user online only on their first active connection
    if (userSockets.get(userId).size === 1) {
      const user = await User.findByIdAndUpdate(
        userId,
        { isOnline: true },
        { new: true }
      );
      io.emit("user_status_changed", {
        userId,
        isOnline: true,
        lastSeen: user?.lastSeen,
      });
    }

    // --- Conversation rooms ---
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // --- Sending a message (text, file/voice, sticker, or gif; optional reply) ---
    socket.on(
      "send_message",
      async ({ conversationId, text, file, sticker, gif, replyTo }, ack) => {
        try {
          const conversation = await Conversation.findById(conversationId);
          if (!conversation || !conversation.participants.some((p) => p.equals(userId))) {
            if (ack) ack({ error: "Not a participant of this conversation" });
            return;
          }

          if (!conversation.isGroup && !conversation.isSelfNote) {
            const otherId = conversation.participants.find((p) => !p.equals(userId));
            const [me, other] = await Promise.all([
              User.findById(userId).select("blockedUsers"),
              User.findById(otherId).select("blockedUsers"),
            ]);
            const blocked =
              me?.blockedUsers.some((id) => id.equals(otherId)) ||
              other?.blockedUsers.some((id) => id.equals(userId));
            if (blocked) {
              if (ack) ack({ error: "You can't message this user" });
              return;
            }
          }

          const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            text: text || "",
            file: file || undefined,
            sticker: sticker || undefined,
            gif: gif || undefined,
            replyTo: replyTo || undefined,
            readBy: [{ user: userId, readAt: new Date() }],
          });

          conversation.lastMessage = message._id;
          conversation.hiddenFor = []; // new activity brings a "deleted" chat back for everyone
          await conversation.save();

          const populated = await populateMessage(message);

          // Everyone currently viewing the conversation gets the message instantly
          io.to(`conversation:${conversationId}`).emit("receive_message", populated);

          // Every participant's personal room gets a lightweight ping so their
          // sidebar / unread badge can update even if the chat isn't open
          conversation.participants.forEach((participantId) => {
            io.to(`user:${participantId}`).emit("conversation_updated", {
              conversationId,
              lastMessage: populated,
            });
          });

          if (ack) ack({ message: populated });
        } catch (err) {
          if (ack) ack({ error: err.message });
        }
      }
    );

    // --- Editing a message (sender only, text only) ---
    socket.on("edit_message", async ({ messageId, text }, ack) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || !message.sender.equals(userId)) {
          if (ack) ack({ error: "You can only edit your own messages" });
          return;
        }
        if (message.isDeletedForEveryone) {
          if (ack) ack({ error: "This message was deleted" });
          return;
        }

        message.text = text;
        message.editedAt = new Date();
        await message.save();

        const populated = await populateMessage(message);
        io.to(`conversation:${message.conversation}`).emit("message_edited", populated);
        if (ack) ack({ message: populated });
      } catch (err) {
        if (ack) ack({ error: err.message });
      }
    });

    // --- Deleting a message ("me" hides it just for the requester,
    //     "everyone" strips the content for all participants) ---
    socket.on("delete_message", async ({ messageId, scope }, ack) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          if (ack) ack({ error: "Message not found" });
          return;
        }

        if (scope === "everyone") {
          if (!message.sender.equals(userId)) {
            if (ack) ack({ error: "Only the sender can delete for everyone" });
            return;
          }
          message.isDeletedForEveryone = true;
          message.text = "";
          message.file = undefined;
          message.sticker = undefined;
          message.gif = undefined;
          message.reactions = [];
          await message.save();

          io.to(`conversation:${message.conversation}`).emit("message_deleted", {
            messageId,
            conversationId: message.conversation,
            scope: "everyone",
          });
        } else {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
          });
          socket.emit("message_deleted", {
            messageId,
            conversationId: message.conversation,
            scope: "me",
          });
        }

        if (ack) ack({ success: true });
      } catch (err) {
        if (ack) ack({ error: err.message });
      }
    });

    // --- Reactions (one emoji per user per message - tap again to remove,
    //     tap a different emoji to switch) ---
    socket.on("toggle_reaction", async ({ messageId, emoji }, ack) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          if (ack) ack({ error: "Message not found" });
          return;
        }

        const existingIndex = message.reactions.findIndex((r) => r.user.equals(userId));
        if (existingIndex >= 0 && message.reactions[existingIndex].emoji === emoji) {
          message.reactions.splice(existingIndex, 1);
        } else if (existingIndex >= 0) {
          message.reactions[existingIndex].emoji = emoji;
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();
        io.to(`conversation:${message.conversation}`).emit("message_reaction_updated", {
          messageId,
          conversationId: message.conversation,
          reactions: message.reactions,
        });
        if (ack) ack({ success: true });
      } catch (err) {
        if (ack) ack({ error: err.message });
      }
    });

    // --- Typing indicators ---
    socket.on("typing", ({ conversationId, username }) => {
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        conversationId,
        userId,
        username,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
        conversationId,
        userId,
      });
    });

    // --- Read receipts (tracks *when* each person read it, for "seen at") ---
    socket.on("mark_read", async ({ conversationId, messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const readAt = new Date();
        const existing = message.readBy.find((r) => r.user.equals(userId));
        if (existing) {
          existing.readAt = readAt;
        } else {
          message.readBy.push({ user: userId, readAt });
        }
        await message.save();

        socket.to(`conversation:${conversationId}`).emit("message_read", {
          conversationId,
          messageId,
          userId,
          readAt,
        });
      } catch (err) {
        // Non-critical - ignore failures silently
      }
    });

    // --- Group membership changes broadcast to everyone currently affected ---
    socket.on("group_updated", ({ conversationId, participantIds }) => {
      // The REST endpoints do the actual DB work; this just lets the caller
      // ask us to notify every affected participant's personal room so their
      // sidebars refresh without a manual reload.
      (participantIds || []).forEach((participantId) => {
        io.to(`user:${participantId}`).emit("group_updated", { conversationId });
      });
    });

    // --- Disconnect handling ---
    socket.on("disconnect", async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          const user = await User.findByIdAndUpdate(
            userId,
            { isOnline: false, lastSeen: new Date() },
            { new: true }
          );
          io.emit("user_status_changed", {
            userId,
            isOnline: false,
            lastSeen: user?.lastSeen,
          });
        }
      }
    });
  });
}

module.exports = initSocket;
