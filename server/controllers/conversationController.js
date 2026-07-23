const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");

const PARTICIPANT_FIELDS =
  "username displayName avatarColor avatarUrl bio isOnline lastSeen showLastSeen";

// Every user gets exactly one "Saved Messages" conversation with themself,
// created lazily the first time their conversation list is requested.
async function getOrCreateSavedMessages(user) {
  if (user.savedMessagesConversation) {
    const existing = await Conversation.findById(user.savedMessagesConversation).populate(
      "participants",
      PARTICIPANT_FIELDS
    );
    if (existing) return existing;
  }

  const created = await Conversation.create({
    isSelfNote: true,
    isGroup: false,
    participants: [user._id],
  });

  await User.findByIdAndUpdate(user._id, { savedMessagesConversation: created._id });

  return created.populate("participants", PARTICIPANT_FIELDS);
}

// GET /api/conversations - all conversations the current user belongs to,
// with Saved Messages always present and pinned conversations sorted first
async function listConversations(req, res) {
  try {
    const savedMessages = await getOrCreateSavedMessages(req.user);

    const conversations = await Conversation.find({
      participants: req.user._id,
      isSelfNote: false,
      hiddenFor: { $ne: req.user._id },
    })
      .populate("participants", PARTICIPANT_FIELDS)
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username" },
      })
      .sort({ updatedAt: -1 });

    const pinnedIds = new Set(req.user.pinnedConversations.map((id) => id.toString()));
    const sorted = conversations.sort((a, b) => {
      const aPinned = pinnedIds.has(a._id.toString());
      const bPinned = pinnedIds.has(b._id.toString());
      if (aPinned === bPinned) return 0;
      return aPinned ? -1 : 1;
    });

    res.json({ conversations: [savedMessages, ...sorted] });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch conversations", error: err.message });
  }
}

// POST /api/conversations
// Body: { participantId } for a private chat, OR { groupName, participantIds: [] } for a group
async function createConversation(req, res) {
  try {
    const { participantId, groupName, participantIds } = req.body;

    if (groupName) {
      if (!participantIds || participantIds.length < 2) {
        return res
          .status(400)
          .json({ message: "A group needs at least 2 other members" });
      }

      const conversation = await Conversation.create({
        isGroup: true,
        groupName,
        groupAdmin: req.user._id,
        participants: [req.user._id, ...participantIds],
      });

      const populated = await conversation.populate("participants", PARTICIPANT_FIELDS);
      return res.status(201).json({ conversation: populated });
    }

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    const other = await User.findById(participantId);
    if (!other) {
      return res.status(404).json({ message: "User not found" });
    }
    if (
      other.blockedUsers.includes(req.user._id) ||
      req.user.blockedUsers.includes(other._id)
    ) {
      return res.status(403).json({ message: "You can't message this user" });
    }

    // Reuse an existing private conversation if one already exists
    const existing = await Conversation.findOne({
      isGroup: false,
      isSelfNote: false,
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate("participants", PARTICIPANT_FIELDS);

    if (existing) {
      return res.json({ conversation: existing });
    }

    const conversation = await Conversation.create({
      isGroup: false,
      participants: [req.user._id, participantId],
    });

    const populated = await conversation.populate("participants", PARTICIPANT_FIELDS);
    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: "Could not create conversation", error: err.message });
  }
}

function requireGroupAdmin(conversation, userId) {
  return conversation.isGroup && conversation.groupAdmin?.toString() === userId.toString();
}

// PATCH /api/conversations/:id - rename a group (admin only)
async function updateConversation(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!requireGroupAdmin(conversation, req.user._id)) {
      return res.status(403).json({ message: "Only the group admin can do that" });
    }

    if (req.body.groupName) conversation.groupName = req.body.groupName;
    if (req.body.groupAvatarColor) conversation.groupAvatarColor = req.body.groupAvatarColor;
    await conversation.save();

    const populated = await conversation.populate("participants", PARTICIPANT_FIELDS);
    res.json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: "Could not update group", error: err.message });
  }
}

// POST /api/conversations/:id/members - add members (admin only)
async function addMembers(req, res) {
  try {
    const { participantIds } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!requireGroupAdmin(conversation, req.user._id)) {
      return res.status(403).json({ message: "Only the group admin can do that" });
    }

    const toAdd = (participantIds || []).filter(
      (id) => !conversation.participants.some((p) => p.toString() === id)
    );
    conversation.participants.push(...toAdd);
    await conversation.save();

    const populated = await conversation.populate("participants", PARTICIPANT_FIELDS);
    res.json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: "Could not add members", error: err.message });
  }
}

// DELETE /api/conversations/:id/members/:userId - remove a member (admin only)
async function removeMember(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!requireGroupAdmin(conversation, req.user._id)) {
      return res.status(403).json({ message: "Only the group admin can do that" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== req.params.userId
    );
    await conversation.save();

    const populated = await conversation.populate("participants", PARTICIPANT_FIELDS);
    res.json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: "Could not remove member", error: err.message });
  }
}

// POST /api/conversations/:id/leave - leave a group yourself
async function leaveConversation(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    // Hand off admin duties if the admin is the one leaving
    if (conversation.groupAdmin?.toString() === req.user._id.toString()) {
      conversation.groupAdmin = conversation.participants[0] || null;
    }

    await conversation.save();
    res.json({ message: "Left the group" });
  } catch (err) {
    res.status(500).json({ message: "Could not leave group", error: err.message });
  }
}

// GET /api/conversations/:id/stats/:userId
// Message/file/GIF/sticker counts for one participant, scoped to this
// conversation only (never a global, cross-conversation activity count).
async function getMemberStats(req, res) {
  try {
    const { id: conversationId, userId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some((p) => p.equals(req.user._id))) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }

    const base = { conversation: conversationId, sender: userId, isDeletedForEveryone: false };

    const [totalMessages, totalFiles, totalVoiceNotes, totalGifs, totalStickers] = await Promise.all([
      Message.countDocuments(base),
      Message.countDocuments({ ...base, "file.url": { $exists: true }, "file.isVoice": { $ne: true } }),
      Message.countDocuments({ ...base, "file.isVoice": true }),
      Message.countDocuments({ ...base, "gif.url": { $exists: true } }),
      Message.countDocuments({ ...base, "sticker.url": { $exists: true } }),
    ]);

    res.json({ totalMessages, totalFiles, totalVoiceNotes, totalGifs, totalStickers });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch member stats", error: err.message });
  }
}

// POST /api/conversations/:id/hide - "delete chat" from my own list only.
// Reappears automatically the next time there's new activity in it.
async function hideConversation(req, res) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some((p) => p.equals(req.user._id))) {
      return res.status(403).json({ message: "Not a participant of this conversation" });
    }
    if (conversation.isSelfNote) {
      return res.status(400).json({ message: "Saved Messages can't be deleted" });
    }

    await Conversation.findByIdAndUpdate(req.params.id, {
      $addToSet: { hiddenFor: req.user._id },
    });
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ message: "Could not delete chat", error: err.message });
  }
}

module.exports = {
  listConversations,
  createConversation,
  updateConversation,
  addMembers,
  removeMember,
  leaveConversation,
  getMemberStats,
  hideConversation,
};
