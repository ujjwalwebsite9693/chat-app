const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { ACCENT_VALUES, WALLPAPER_VALUES, THEME_VALUES } = require("../models/User");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/users?search=exactUsername
// SECURITY: this is a lookup, not a directory. There is no way to browse or
// enumerate other users - an empty/short query returns nothing, and a query
// only ever matches a single user by their *exact* username (case-insensitive).
// You can only start a chat with someone if you already know their username.
async function listUsers(req, res) {
  try {
    const search = (req.query.search || "").trim();

    if (search.length < 3) {
      return res.json({ users: [] });
    }

    const match = await User.findOne({
      _id: { $ne: req.user._id, $nin: req.user.blockedUsers },
      username: new RegExp(`^${escapeRegex(search)}$`, "i"),
    }).select("username displayName email bio avatarColor avatarUrl isOnline lastSeen showLastSeen");

    res.json({ users: match ? [match] : [] });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch users", error: err.message });
  }
}

const PROFILE_FIELDS = ["username", "displayName", "bio", "avatarColor", "showLastSeen"];
const APPEARANCE_FIELDS = ["theme", "accentColor", "wallpaper", "wallpaperCustomUrl"];

// PATCH /api/users/me
// Body can include any subset of profile + appearance fields
async function updateMe(req, res) {
  try {
    const updates = {};

    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    for (const field of APPEARANCE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.theme && !THEME_VALUES.includes(updates.theme)) {
      return res.status(400).json({ message: "Invalid theme value" });
    }
    if (updates.accentColor && !ACCENT_VALUES.includes(updates.accentColor)) {
      return res.status(400).json({ message: "Invalid accent color" });
    }
    if (updates.wallpaper && !WALLPAPER_VALUES.includes(updates.wallpaper)) {
      return res.status(400).json({ message: "Invalid wallpaper value" });
    }

    if (updates.username) {
      const clash = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user._id },
      });
      if (clash) {
        return res.status(409).json({ message: "That username is already taken" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Could not update profile", error: err.message });
  }
}

// POST /api/users/me/avatar - multipart form field name: "file"
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image was uploaded" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: `/uploads/${req.file.filename}` },
      { new: true }
    );

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Could not update avatar", error: err.message });
  }
}

// PATCH /api/users/me/password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // pre-save hook re-hashes this
    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Could not change password", error: err.message });
  }
}

// POST/DELETE /api/users/me/pinned/:conversationId
async function togglePinned(req, res) {
  try {
    const { conversationId } = req.params;
    const op = req.method === "POST" ? "$addToSet" : "$pull";

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { [op]: { pinnedConversations: conversationId } },
      { new: true }
    );

    res.json({ pinnedConversations: user.pinnedConversations });
  } catch (err) {
    res.status(500).json({ message: "Could not update pinned chats", error: err.message });
  }
}

// POST/DELETE /api/users/me/muted/:conversationId
async function toggleMuted(req, res) {
  try {
    const { conversationId } = req.params;
    const op = req.method === "POST" ? "$addToSet" : "$pull";

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { [op]: { mutedConversations: conversationId } },
      { new: true }
    );

    res.json({ mutedConversations: user.mutedConversations });
  } catch (err) {
    res.status(500).json({ message: "Could not update muted chats", error: err.message });
  }
}

// POST/DELETE /api/users/me/blocked/:userId
async function toggleBlocked(req, res) {
  try {
    const { userId } = req.params;
    const op = req.method === "POST" ? "$addToSet" : "$pull";

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { [op]: { blockedUsers: userId } },
      { new: true }
    );

    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ message: "Could not update blocked users", error: err.message });
  }
}

// GET /api/users/me/blocked - populated details for the settings UI
async function listBlockedUsers(req, res) {
  try {
    const user = await User.findById(req.user._id).populate(
      "blockedUsers",
      "username avatarColor avatarUrl"
    );
    res.json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch blocked users", error: err.message });
  }
}

// --- Chat Lock (PIN-gated "locked chats") ---

// PATCH /api/users/me/lock-pin - set or change the PIN
async function setLockPin(req, res) {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4-6 digits" });
    }
    const user = await User.findById(req.user._id).select("+lockPinHash");
    user.lockPinHash = await bcrypt.hash(pin, 10);
    await user.save();
    res.json({ hasLockPin: true });
  } catch (err) {
    res.status(500).json({ message: "Could not set lock PIN", error: err.message });
  }
}

// DELETE /api/users/me/lock-pin - remove the PIN and unlock everything
async function removeLockPin(req, res) {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { lockPinHash: "" },
      $set: { lockedConversations: [] },
    });
    res.json({ hasLockPin: false, lockedConversations: [] });
  } catch (err) {
    res.status(500).json({ message: "Could not remove lock PIN", error: err.message });
  }
}

// POST /api/users/me/verify-lock-pin - body: { pin }
async function verifyLockPin(req, res) {
  try {
    const user = await User.findById(req.user._id).select("+lockPinHash");
    const valid = await user.compareLockPin(req.body.pin || "");
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ message: "Could not verify PIN", error: err.message });
  }
}

// POST/DELETE /api/users/me/locked/:conversationId
async function toggleLocked(req, res) {
  try {
    const user = await User.findById(req.user._id).select("+lockPinHash");
    if (!user.lockPinHash) {
      return res.status(400).json({ message: "Set a lock PIN in Settings first" });
    }

    const { conversationId } = req.params;
    const op = req.method === "POST" ? "$addToSet" : "$pull";
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { [op]: { lockedConversations: conversationId } },
      { new: true }
    );

    res.json({ lockedConversations: updated.lockedConversations });
  } catch (err) {
    res.status(500).json({ message: "Could not update locked chats", error: err.message });
  }
}

// --- Private, per-contact nicknames ---

// POST /api/users/me/nickname/:userId - body: { nickname }
async function setNickname(req, res) {
  try {
    const { userId } = req.params;
    const nickname = (req.body.nickname || "").trim();

    const user = await User.findById(req.user._id);
    const existing = user.contactNicknames.find((n) => n.user.toString() === userId);
    if (existing) {
      existing.nickname = nickname;
    } else {
      user.contactNicknames.push({ user: userId, nickname });
    }
    await user.save();

    res.json({ contactNicknames: user.contactNicknames });
  } catch (err) {
    res.status(500).json({ message: "Could not save nickname", error: err.message });
  }
}

// DELETE /api/users/me/nickname/:userId
async function removeNickname(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { contactNicknames: { user: userId } } },
      { new: true }
    );
    res.json({ contactNicknames: user.contactNicknames });
  } catch (err) {
    res.status(500).json({ message: "Could not remove nickname", error: err.message });
  }
}

module.exports = {
  listUsers,
  updateMe,
  uploadAvatar,
  changePassword,
  togglePinned,
  toggleMuted,
  toggleBlocked,
  listBlockedUsers,
  setLockPin,
  removeLockPin,
  verifyLockPin,
  toggleLocked,
  setNickname,
  removeNickname,
};
