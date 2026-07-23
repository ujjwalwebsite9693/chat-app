const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const THEME_VALUES = ["dark", "light"];
const WALLPAPER_VALUES = [
  "default",
  "dots",
  "waves",
  "gradient-sunset",
  "gradient-mint",
  "gradient-violet",
  "solid-black",
  "custom",
];
const ACCENT_VALUES = [
  "#5B6EF5", // signal violet (default)
  "#F5A623", // amber
  "#34D399", // green
  "#FF6B6B", // rose
  "#38BDF8", // sky blue
  "#C084FC", // orchid
];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    // An optional "real name" the person sets for themself - shown
    // alongside their @username everywhere (like Telegram's name vs handle).
    displayName: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 140,
      default: "",
    },
    avatarColor: {
      type: String,
      default: "#5B6EF5",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    showLastSeen: {
      type: Boolean,
      default: true,
    },

    // --- Appearance preferences ---
    theme: {
      type: String,
      enum: THEME_VALUES,
      default: "dark",
    },
    accentColor: {
      type: String,
      enum: ACCENT_VALUES,
      default: "#5B6EF5",
    },
    wallpaper: {
      type: String,
      enum: WALLPAPER_VALUES,
      default: "default",
    },
    wallpaperCustomUrl: {
      type: String,
      default: "",
    },

    // --- Personal organisation ---
    pinnedConversations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    ],
    mutedConversations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    ],
    lockedConversations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    ],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    savedMessagesConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    // Hashed PIN gating access to "locked" chats - never sent to the client.
    lockPinHash: {
      type: String,
      select: false,
    },

    // Private nicknames *I* set for other people - only visible to me,
    // never changes their actual username/displayName.
    contactNicknames: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        nickname: { type: String, trim: true, maxlength: 40 },
      },
    ],
  },
  { timestamps: true }
);

// Hash the password before saving, but only if it changed
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.compareLockPin = function compareLockPin(candidate) {
  if (!this.lockPinHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.lockPinHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    bio: this.bio,
    avatarColor: this.avatarColor,
    avatarUrl: this.avatarUrl,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    showLastSeen: this.showLastSeen,
    theme: this.theme,
    accentColor: this.accentColor,
    wallpaper: this.wallpaper,
    wallpaperCustomUrl: this.wallpaperCustomUrl,
    pinnedConversations: this.pinnedConversations,
    mutedConversations: this.mutedConversations,
    lockedConversations: this.lockedConversations,
    blockedUsers: this.blockedUsers,
    savedMessagesConversation: this.savedMessagesConversation,
    hasLockPin: Boolean(this.lockPinHash),
    contactNicknames: this.contactNicknames,
  };
};

module.exports = mongoose.model("User", userSchema);
module.exports.THEME_VALUES = THEME_VALUES;
module.exports.WALLPAPER_VALUES = WALLPAPER_VALUES;
module.exports.ACCENT_VALUES = ACCENT_VALUES;
