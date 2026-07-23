const express = require("express");
const {
  listConversations,
  createConversation,
  updateConversation,
  addMembers,
  removeMember,
  leaveConversation,
  getMemberStats,
  hideConversation,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, listConversations);
router.post("/", protect, createConversation);
router.patch("/:id", protect, updateConversation);
router.post("/:id/members", protect, addMembers);
router.delete("/:id/members/:userId", protect, removeMember);
router.post("/:id/leave", protect, leaveConversation);
router.get("/:id/stats/:userId", protect, getMemberStats);
router.post("/:id/hide", protect, hideConversation);

module.exports = router;
