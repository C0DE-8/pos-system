const authMiddleware = require("./authMiddleware");
const { query } = require("../config/db");

async function authenticateToken(req, res, next) {
  return authMiddleware(req, res, next);
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

function requireAnyPermission(...permissionKeys) {
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

      if (!perms.length) {
        return res.status(403).json({
          success: false,
          message: `Missing one of permissions: ${permissionKeys.join(", ")}`
        });
      }

      const hasPermission = permissionKeys.some((permissionKey) => !!perms[0][permissionKey]);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Missing one of permissions: ${permissionKeys.join(", ")}`
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
  requirePermission,
  requireAnyPermission
};
