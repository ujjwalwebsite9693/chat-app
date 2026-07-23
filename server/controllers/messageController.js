const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const REPLY_POPULATE = {
  path: "replyTo",
  select: "text sender file sticker gif isDeletedForEveryone",
  populate: { path: "sender", select: "username" },
};

// GET /api/messages/:conversationId
async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "username avatarColor avatarUrl")
      .populate(REPLY_POPULATE)
      .sort({ createdAt: 1 });

    // Messages deleted "for everyone" keep their row (so ordering/replies still
    // make sense) but never leak their original content to the client.
    const sanitized = messages.map((m) => {
      if (!m.isDeletedForEveryone) return m;
      const obj = m.toObject();
      obj.text = "";
      obj.file = undefined;
      obj.sticker = undefined;
      obj.gif = undefined;
      obj.reactions = [];
      return obj;
    });

    res.json({ messages: sanitized });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch messages", error: err.message });
  }
}

// POST /api/messages/upload - multipart form field name: "file"
// Returns file metadata; the client then emits this over the socket as part of send_message
async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded" });
    }

    res.status(201).json({
      file: {
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "File upload failed", error: err.message });
  }
}

// GET /api/messages/:conversationId/search?q=hello
async function searchMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ messages: [] });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
      isDeletedForEveryone: false,
      text: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    })
      .populate("sender", "username avatarColor avatarUrl")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
}

// GET /api/messages/:conversationId/media?type=file|gif|sticker
async function getMedia(req, res) {
  try {
    const { conversationId } = req.params;
    const { type } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    const base = {
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
      isDeletedForEveryone: false,
    };

    let filter;
    if (type === "gif") filter = { ...base, "gif.url": { $exists: true } };
    else if (type === "sticker") filter = { ...base, "sticker.url": { $exists: true } };
    else filter = { ...base, "file.url": { $exists: true }, "file.isVoice": { $ne: true } };

    const messages = await Message.find(filter)
      .populate("sender", "username avatarColor avatarUrl")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch media", error: err.message });
  }
}

module.exports = { getMessages, uploadFile, searchMessages, getMedia, REPLY_POPULATE };
