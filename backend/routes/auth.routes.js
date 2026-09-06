const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const BRANCH_CACHE_TTL_MS = 60 * 1000;
const BRANCH_CACHE_STALE_MS = 15 * 60 * 1000;
const TRANSIENT_DB_ERRORS = new Set(["ECONNRESET", "ETIMEDOUT", "EPIPE", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);
let branchCache = { data: [], updatedAt: 0 };
let branchRequest = null;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const loadBranchSlugs = async () => {
  const sql = `SELECT bb.slug, bb.name, bb.business_id, b.name AS business_name
    FROM business_branches bb
    JOIN businesses b ON b.id = bb.business_id
    WHERE bb.is_active = 1 AND b.is_active = 1
    ORDER BY b.name ASC, bb.name ASC`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await query(sql);
    } catch (error) {
      lastError = error;
      if (!TRANSIENT_DB_ERRORS.has(error?.code) || attempt === 2) throw error;
      await wait(150 * (attempt + 1));
    }
  }
  throw lastError;
};

// /api/auth/branch-slugs - get active branch slugs for login selector
router.get("/branch-slugs", async (req, res) => {
  const now = Date.now();
  if (branchCache.data.length && now - branchCache.updatedAt < BRANCH_CACHE_TTL_MS) {
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
    return res.json({ success: true, data: branchCache.data, cached: true });
  }

  try {
    branchRequest ||= loadBranchSlugs().finally(() => { branchRequest = null; });
    const rows = await branchRequest;
    branchCache = { data: rows, updatedAt: Date.now() };
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");

    return res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    if (branchCache.data.length && now - branchCache.updatedAt < BRANCH_CACHE_STALE_MS) {
      res.set("Warning", '110 - "Response is stale"');
      return res.json({ success: true, data: branchCache.data, cached: true, stale: true });
    }
    console.error("Unable to load login branches:", error);
    return res.status(500).json({
      success: false,
      message: "Branches are temporarily unavailable. Please try again."
    });
  }
});

// /api/auth/login - login with username/email + password + branch_slug
router.post("/login", async (req, res) => {
  try {
    const { identifier, email, username, password, branch_slug } = req.body;
    const loginValue = String(identifier || email || username || "").trim();

    if (!loginValue || !password || !branch_slug) {
      return res.status(400).json({
        success: false,
        message: "username/email, password and branch_slug are required"
      });
    }

    const users = await query(
      `SELECT *
       FROM users
       WHERE (email = ? OR name = ?)
       AND is_active = 1 
       LIMIT 1`,
      [loginValue, loginValue]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    const passwordHash = user.password_hash || user.pin_hash;
    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const branches = await query(
      `SELECT id, business_id, is_active
       FROM business_branches
       WHERE slug = ?
       LIMIT 1`,
      [branch_slug]
    );

    if (!branches.length || !Number(branches[0].is_active)) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or inactive"
      });
    }

    const branch = branches[0];

    if (Number(user.business_id) !== Number(branch.business_id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this branch"
      });
    }

    if (!["admin", "owner"].includes(String(user.role).toLowerCase())) {
      if (Number(user.branch_id) !== Number(branch.id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this branch"
        });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        business_id: user.business_id || null,
        branch_id: branch.id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15h" }
    );

    await query(
      "INSERT INTO clock_events (user_id, event_type) VALUES (?, 'in')",
      [user.id]
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        business_id: user.business_id || null,
        branch_id: branch.id
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// logout
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await query(
      "INSERT INTO clock_events (user_id, event_type) VALUES (?, 'out')",
      [req.user.id]
    );

    return res.json({ success: true, message: "Logout recorded" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const permissions = await query(
      "SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );

    return res.json({
      success: true,
      user: req.user,
      permissions: permissions[0] || null
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
