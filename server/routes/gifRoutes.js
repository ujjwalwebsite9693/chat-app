const express = require("express");
const { search, trending } = require("../controllers/gifController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/search", protect, search);
router.get("/trending", protect, trending);

module.exports = router;
