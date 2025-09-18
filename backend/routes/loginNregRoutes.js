// backend/routes/loginNregRoutes.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Person = require("../person");
const authenticate = require("../middleware/authenticate");

require("dotenv").config();

const JWT_SECRET = process.env.MY_SECRET_KEY;
if (!JWT_SECRET) {
  // Fail fast if secret is missing
  console.warn("[auth] MY_SECRET_KEY is not set in env");
}

/* ----------------------------- helpers ---------------------------------- */

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateRegister({ fullName, email, password }) {
  const errors = {};
  if (!fullName || !String(fullName).trim()) {
    errors.fullName = "Full name is required";
  }
  const em = normalizeEmail(email);
  if (!em) errors.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(em)) errors.email = "Email is invalid";

  if (!password || typeof password !== "string") {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return { ok: Object.keys(errors).length === 0, errors, email: em };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

/* ------------------------------ routes ---------------------------------- */

/**
 * POST /register
 * Body: { fullName, email, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};
    const { ok, errors, email: normEmail } = validateRegister({
      fullName,
      email,
      password,
    });

    if (!ok) return res.status(400).json({ error: errors });

    // Check duplicate email (case-insensitive)
    const existing = await Person.findOne({ email: normEmail }).lean();
    if (existing) {
      return res
        .status(400)
        .json({ error: { email: "An account with this email already exists" } });
    }

    // Optional: prevent duplicate fullName if you want uniqueness
    // const nameExists = await Person.findOne({ fullName: String(fullName).trim() }).lean();
    // if (nameExists) {
    //   return res.status(400).json({ error: { fullName: "Full name already taken" } });
    // }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    const person = await Person.create({
      fullName: String(fullName).trim(),
      email: normEmail,
      password: hashed,
    });

    // Return safe payload (do NOT include password)
    return res.status(201).json({
      _id: person._id,
      fullName: person.fullName,
      email: person.email,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("POST /register error:", error);
    if (error?.code === 11000) {
      // Unique index violation (email or fullName)
      return res
        .status(400)
        .json({ error: "Duplicate entry for full name or email." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /login
 * Body: { email, password }
 * Returns: { token, user }
 */
router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const user = await Person.findOne({ email });
    if (!user) {
      // Use generic error to avoid user enumeration
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Generic error again
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("POST /login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /profile
 * Requires: Authorization: Bearer <token>
 */
router.get("/profile", authenticate, async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const user = await Person.findById(req.user.id)
      .select("_id fullName email")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    return res
      .status(200)
      .json({ message: "Welcome to your profile!", user, iat: req.user.iat, exp: req.user.exp });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;