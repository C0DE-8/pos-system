const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await query(
      "SELECT id, name, email, avatar, role, is_active FROM users WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (!users.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid token user"
      });
    }

    if (!users[0].is_active) {
      return res.status(403).json({
        success: false,
        message: "User account disabled"
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    next();
  };
}

function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      if (req.user.role === "admin") {
        return next();
      }

      const perms = await query(
        "SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1",
        [req.user.id]
      );

      if (!perms.length || !perms[0][permissionKey]) {
        return res.status(403).json({
          success: false,
          message: `Missing permission: ${permissionKey}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission
};