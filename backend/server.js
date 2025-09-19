// 🌐 Core Modules
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// 🔌 Database
const { connectDB } = require("./db");

// 👥 Presence (simple in-memory tracker)
const presence = require("./presence");

// 🧰 Routes & Middleware
const authenticate = require("./middleware/authenticate");
const personRoutes = require("./routes/loginNregRoutes");
const communityRoutes = require("./routes/communityRoutes");
const memberRoutes = require("./routes/memberRoutes");
const messageRoutes = require("./routes/messageRoutes");
const directMessageRoutes = require("./routes/directMessageRoutes");

// ⚙️ App & Server
const app = express();
const server = http.createServer(app);

// ───────────────────────── Configuration ─────────────────────────
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.MY_SECRET_KEY;
if (!JWT_SECRET) {
  console.warn("⚠️  MY_SECRET_KEY is not set. JWT auth will fail.");
}

// ─────────────────────── Security & Middleware ───────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: ORIGIN,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Make io & presence available on req (routes can emit & read status)
let io;
app.use((req, _res, next) => {
  req.io = io;
  req.presence = presence;
  next();
});

// Simple root + health for quick checks
app.get("/", (_req, res) => res.json({ ok: true, service: "community-talk-api" }));
app.get("/health", (_req, res) =>
  res.status(200).json({ ok: true, uptime: process.uptime() })
);

// ───────────────────────── Socket.IO ─────────────────────────
io = new Server(server, {
  cors: {
    origin: ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["authorization", "content-type"],
  },
  path: "/socket.io",
  pingTimeout: 25000,
  pingInterval: 20000,
});

// Verify JWT on the socket and attach user
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || "").split(" ")[1];

    if (!token) return next(new Error("No token provided"));
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
    };
    return next();
  } catch (_err) {
    return next(new Error("Invalid token"));
  }
});

// Handle socket connections
io.on("connection", (socket) => {
  const uid = socket.user?.id;
  console.log(`🔌 Socket connected ${socket.id} (user: ${uid || "unknown"})`);

  if (uid) {
    // Track presence
    const wasOffline = !presence.isOnline(uid);
    presence.connect(uid, socket.id);

    if (wasOffline) {
      io.emit("presence:update", { userId: uid, status: "online" });
    }

    // Join personal room for DMs
    socket.join(uid);
  }

  // Back-compat: client can manually join a room
  socket.on("join", (userId) => {
    if (userId) socket.join(userId);
  });

  socket.on("disconnect", () => {
    if (!uid) return;
    const wasOnline = presence.isOnline(uid);
    presence.disconnect(uid, socket.id);
    const nowOnline = presence.isOnline(uid);
    if (wasOnline && !nowOnline) {
      io.emit("presence:update", { userId: uid, status: "offline" });
    }
    console.log(`❌ Socket disconnected ${socket.id}`);
  });
});

// ───────────────────────── Routes ─────────────────────────
// Public auth routes (register/login/profile)
app.use("/", personRoutes);

// Protected API routes (JWT required)
app.use("/api/communities", authenticate, communityRoutes);
app.use("/api/members", authenticate, memberRoutes);
app.use("/api/messages", authenticate, messageRoutes);
app.use("/api/direct-messages", authenticate, directMessageRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

// Error handler (last)
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Server Error" });
});

// Log crashes that would otherwise be silent
process.on("unhandledRejection", (reason) => {
  console.error("🔥 UnhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("🔥 UncaughtException:", err);
});

// Graceful shutdown
const shutdown = () => {
  console.log("🛑 Shutting down...");
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ───────────────────────── Startup ─────────────────────────
(async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`🔗 CORS origin: ${ORIGIN}`);
      console.log(`🩺 Health:      http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();