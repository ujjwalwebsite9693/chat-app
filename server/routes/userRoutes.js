const express = require("express");
const {
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
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", protect, listUsers);
router.patch("/me", protect, updateMe);
router.post("/me/avatar", protect, upload.single("file"), uploadAvatar);
router.patch("/me/password", protect, changePassword);

router.post("/me/pinned/:conversationId", protect, togglePinned);
router.delete("/me/pinned/:conversationId", protect, togglePinned);

router.post("/me/muted/:conversationId", protect, toggleMuted);
router.delete("/me/muted/:conversationId", protect, toggleMuted);

router.post("/me/blocked/:userId", protect, toggleBlocked);
router.delete("/me/blocked/:userId", protect, toggleBlocked);
router.get("/me/blocked", protect, listBlockedUsers);

router.patch("/me/lock-pin", protect, setLockPin);
router.delete("/me/lock-pin", protect, removeLockPin);
router.post("/me/verify-lock-pin", protect, verifyLockPin);
router.post("/me/locked/:conversationId", protect, toggleLocked);
router.delete("/me/locked/:conversationId", protect, toggleLocked);

router.post("/me/nickname/:userId", protect, setNickname);
router.delete("/me/nickname/:userId", protect, removeNickname);

module.exports = router;
