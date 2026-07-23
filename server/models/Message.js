const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    // An uploaded image / document / voice note
    file: {
      url: { type: String },
      name: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      isVoice: { type: Boolean, default: false },
      durationSeconds: { type: Number },
    },
    // A bundled sticker (no upload - just a reference to a static asset)
    sticker: {
      id: { type: String },
      url: { type: String },
      label: { type: String },
    },
    // A GIF picked from the Giphy search picker
    gif: {
      url: { type: String },
      previewUrl: { type: String },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    editedAt: {
      type: Date,
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
