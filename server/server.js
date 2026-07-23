require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const initSocket = require("./socket/socketHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const gifRoutes = require("./routes/gifRoutes");

const app = express();
const server = http.createServer(app);

const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

const io = new Server(server, {
  cors: {
    origin: clientOrigins,
    credentials: true,
  },
});

// --- Middleware ---
app.use(cors({ origin: clientOrigins, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- REST routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/gifs", gifRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Error handler (e.g. multer file-type/size errors) ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// --- Real-time layer ---
initSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Relay server running on http://localhost:${PORT}`);
  });
});
