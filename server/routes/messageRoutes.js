const express = require("express");
const { getMessages, uploadFile, searchMessages, getMedia } = require("../controllers/messageController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadFile);
router.get("/:conversationId/search", protect, searchMessages);
router.get("/:conversationId/media", protect, getMedia);
router.get("/:conversationId", protect, getMessages);

module.exports = router;
