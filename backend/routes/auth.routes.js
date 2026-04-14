const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// /api/auth/login - login with name or email + PIN
router.post("/login", async (req, res) => {
  try {
    const { name, pin } = req.body;

    if (!name || !pin) {
      return res.status(400).json({
        success: false,
        message: "Name or Email and PIN are required"
      });
    }

    const users = await query(
      `SELECT * FROM users 
       WHERE (name = ? OR email = ?) 
       AND is_active = 1 
       LIMIT 1`,
      [name, name]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(pin, user.pin_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
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
        role: user.role
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
router.post("/logout", authenticateToken, async (req, res) => {
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
router.get("/me", authenticateToken, async (req, res) => {
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