const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();
// helper: all permission columns
const permissionColumns = [
  "pos",
  "courts",
  "inventory",
  "sales",
  "members",
  "users",
  "settings",
  "stockAdj",
  "refunds",
  "shifts",
  "purchaseOrders",
  "analytics",
  "kds",
  "giftCards"
];
// helper: build all 1s
const allTruePermissions = () => permissionColumns.map(() => 1);
// helper: build all 0s
const allFalsePermissions = () => permissionColumns.map(() => 0);

function getScopedBusinessId(req) {
  return req.body?.business_id || req.query?.business_id || req.user?.business_id || null;
}

function formatBranch(row) {
  if (!row.branch_id) return null;
  return {
    id: row.branch_id,
    business_id: row.branch_business_id,
    name: row.branch_name,
    slug: row.branch_slug,
    is_main: !!row.branch_is_main,
    is_active: !!row.branch_is_active
  };
}


router.use(authenticateToken);
router.use(requireRole("admin", "manager", "viewer", "cashier"));



// dashboard summary
router.get("/dashboard", async (req, res) => {
  try {
    const users = await query("SELECT COUNT(*) AS total FROM users");
    const products = await query("SELECT COUNT(*) AS total FROM products");
    const sales = await query("SELECT COUNT(*) AS total FROM sales");
    const revenue = await query(
      "SELECT IFNULL(SUM(total),0) AS total FROM sales WHERE status='completed'"
    );

    res.json({
      success: true,
      data: {
        users: users[0].total,
        products: products[0].total,
        sales: sales[0].total,
        revenue: revenue[0].total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// admin/users get users
router.get("/users", async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.role,
        u.is_active,
        u.created_at,
        u.business_id,
        u.branch_id,
        bb.business_id AS branch_business_id,
        bb.name AS branch_name,
        bb.slug AS branch_slug,
        bb.is_main AS branch_is_main,
        bb.is_active AS branch_is_active,

        up.pos,
        up.courts,
        up.inventory,
        up.sales,
        up.members,
        up.users,
        up.settings,
        up.stockAdj,
        up.refunds,
        up.shifts,
        up.purchaseOrders,
        up.analytics,
        up.kds,
        up.giftCards,

        ce.event_type AS last_clock_event,
        ce.created_at AS last_clock_time

      FROM users u

      LEFT JOIN user_permissions up 
        ON up.user_id = u.id

      LEFT JOIN business_branches bb
        ON bb.id = u.branch_id

      LEFT JOIN (
        SELECT ce1.user_id, ce1.event_type, ce1.created_at
        FROM clock_events ce1
        WHERE ce1.id = (
          SELECT ce2.id
          FROM clock_events ce2
          WHERE ce2.user_id = ce1.user_id
          ORDER BY ce2.created_at DESC, ce2.id DESC
          LIMIT 1
        )
      ) ce 
        ON ce.user_id = u.id

      ORDER BY u.id DESC
    `);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      is_active: !!user.is_active,
      created_at: user.created_at,
      business_id: user.business_id,
      branch_id: user.branch_id,
      branch: formatBranch(user),
      permissions: {
        pos: !!user.pos,
        courts: !!user.courts,
        inventory: !!user.inventory,
        sales: !!user.sales,
        members: !!user.members,
        users: !!user.users,
        settings: !!user.settings,
        stockAdj: !!user.stockAdj,
        refunds: !!user.refunds,
        shifts: !!user.shifts,
        purchaseOrders: !!user.purchaseOrders,
        analytics: !!user.analytics,
        kds: !!user.kds,
        giftCards: !!user.giftCards
      },
      clock: {
        last_event: user.last_clock_event || null,
        last_time: user.last_clock_time || null,
        is_clocked_in: user.last_clock_event === "in"
      }
    }));

    res.json({
      success: true,
      data: formattedUsers
    });
  } catch (error) {
    console.error("GET /admin/users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users"
    });
  }
});
// admin/users get by id
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const users = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.role,
        u.is_active,
        u.created_at,
        u.business_id,
        u.branch_id,
        bb.business_id AS branch_business_id,
        bb.name AS branch_name,
        bb.slug AS branch_slug,
        bb.is_main AS branch_is_main,
        bb.is_active AS branch_is_active,
        up.pos,
        up.courts,
        up.inventory,
        up.sales,
        up.members,
        up.users,
        up.settings,
        up.stockAdj,
        up.refunds,
        up.shifts,
        up.purchaseOrders,
        up.analytics,
        up.kds,
        up.giftCards,
        ce.event_type AS last_clock_event,
        ce.created_at AS last_clock_time
      FROM users u
      LEFT JOIN user_permissions up ON up.user_id = u.id
      LEFT JOIN business_branches bb ON bb.id = u.branch_id
      LEFT JOIN (
        SELECT c1.user_id, c1.event_type, c1.created_at
        FROM clock_events c1
        INNER JOIN (
          SELECT user_id, MAX(created_at) AS max_created_at
          FROM clock_events
          GROUP BY user_id
        ) c2
        ON c1.user_id = c2.user_id AND c1.created_at = c2.max_created_at
      ) ce ON ce.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `, [id]);

    if (!users.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        business_id: user.business_id,
        branch_id: user.branch_id,
        branch: formatBranch(user),
        permissions: {
          pos: !!user.pos,
          courts: !!user.courts,
          inventory: !!user.inventory,
          sales: !!user.sales,
          members: !!user.members,
          users: !!user.users,
          settings: !!user.settings,
          stockAdj: !!user.stockAdj,
          refunds: !!user.refunds,
          shifts: !!user.shifts,
          purchaseOrders: !!user.purchaseOrders,
          analytics: !!user.analytics,
          kds: !!user.kds,
          giftCards: !!user.giftCards
        },
        clock: {
          last_event: user.last_clock_event || null,
          last_time: user.last_clock_time || null,
          is_clocked_in: user.last_clock_event === "in"
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// admin/users update permissions
router.put("/users/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;

    // first check user
    const existingUser = await query(
      `SELECT id, role FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existingUser.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const targetUser = existingUser[0];

    // all permission keys in one place
    const permissionKeys = [
      "pos",
      "courts",
      "inventory",
      "sales",
      "members",
      "users",
      "settings",
      "stockAdj",
      "refunds",
      "shifts",
      "purchaseOrders",
      "analytics",
      "kds",
      "giftCards"
    ];

    // if target user is admin, force all permissions to 1
    const values =
      targetUser.role === "admin"
        ? permissionKeys.map(() => 1)
        : permissionKeys.map((key) => (req.body[key] ? 1 : 0));

    // check if permissions row exists
    const existingPermissions = await query(
      `SELECT user_id FROM user_permissions WHERE user_id = ? LIMIT 1`,
      [id]
    );

    if (existingPermissions.length) {
      await query(
        `
        UPDATE user_permissions
        SET
          pos = ?,
          courts = ?,
          inventory = ?,
          sales = ?,
          members = ?,
          users = ?,
          settings = ?,
          stockAdj = ?,
          refunds = ?,
          shifts = ?,
          purchaseOrders = ?,
          analytics = ?,
          kds = ?,
          giftCards = ?
        WHERE user_id = ?
        `,
        [...values, id]
      );
    } else {
      await query(
        `
        INSERT INTO user_permissions (
          user_id,
          pos,
          courts,
          inventory,
          sales,
          members,
          users,
          settings,
          stockAdj,
          refunds,
          shifts,
          purchaseOrders,
          analytics,
          kds,
          giftCards
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, ...values]
      );
    }

    const updatedPermissions = await query(
      `
      SELECT
        pos,
        courts,
        inventory,
        sales,
        members,
        users,
        settings,
        stockAdj,
        refunds,
        shifts,
        purchaseOrders,
        analytics,
        kds,
        giftCards
      FROM user_permissions
      WHERE user_id = ?
      LIMIT 1
      `,
      [id]
    );

    res.json({
      success: true,
      message:
        targetUser.role === "admin"
          ? "Admin always has all permissions"
          : "User permissions updated successfully",
      data: {
        user_id: Number(id),
        role: targetUser.role,
        permissions: {
          pos: !!updatedPermissions[0].pos,
          courts: !!updatedPermissions[0].courts,
          inventory: !!updatedPermissions[0].inventory,
          sales: !!updatedPermissions[0].sales,
          members: !!updatedPermissions[0].members,
          users: !!updatedPermissions[0].users,
          settings: !!updatedPermissions[0].settings,
          stockAdj: !!updatedPermissions[0].stockAdj,
          refunds: !!updatedPermissions[0].refunds,
          shifts: !!updatedPermissions[0].shifts,
          purchaseOrders: !!updatedPermissions[0].purchaseOrders,
          analytics: !!updatedPermissions[0].analytics,
          kds: !!updatedPermissions[0].kds,
          giftCards: !!updatedPermissions[0].giftCards
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// admin/users get users clock in/out
router.get("/users/:id/clock", async (req, res) => {
  try {
    const { id } = req.params;

    const userCheck = await query(
      "SELECT id, name FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!userCheck.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const lastEvent = await query(
      `SELECT event_type, created_at
       FROM clock_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    );

    let newEvent = "in";

    if (lastEvent.length && lastEvent[0].event_type === "in") {
      newEvent = "out";
    }

    await query(
      "INSERT INTO clock_events (user_id, event_type) VALUES (?, ?)",
      [id, newEvent]
    );

    res.json({
      success: true,
      message: `User clocked ${newEvent}`,
      data: {
        user_id: Number(id),
        user_name: userCheck[0].name,
        event_type: newEvent
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// admin/users history of clock in/out
router.get("/users/:id/clock-history", async (req, res) => {
  try {
    const { id } = req.params;

    const history = await query(
      `SELECT id, user_id, event_type, created_at
       FROM clock_events
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// /admin/users create admin/cashier/manager/viewer user
router.post("/users", async (req, res) => {
  try {
    const {
      name,
      pin,
      avatar = "👤",
      role = "cashier",
      business_id,
      branch_id,
      permissions = {}
    } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ success: false, message: "Name and PIN required" });
    }

    const existing = await query("SELECT id FROM users WHERE name = ? LIMIT 1", [name]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hash = await bcrypt.hash(pin, 10);
    let businessId = business_id || req.user.business_id || null;
    let branchId = branch_id || null;

    if (branchId) {
      const branches = await query(
        "SELECT id, business_id FROM business_branches WHERE id = ? AND is_active = 1 LIMIT 1",
        [branchId]
      );
      if (!branches.length) {
        return res.status(400).json({ success: false, message: "Branch not found" });
      }
      businessId = branches[0].business_id;
    }

    const result = await query(
      "INSERT INTO users (name, avatar, role, pin_hash, business_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, avatar, role, hash, businessId, branchId]
    );

    const userId = result.insertId;

    await query(
      `INSERT INTO user_permissions 
      (user_id, pos, courts, inventory, sales, members, users, settings, stockAdj, refunds, shifts, purchaseOrders, analytics, kds, giftCards)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        permissions.pos ? 1 : 0,
        permissions.courts ? 1 : 0,
        permissions.inventory ? 1 : 0,
        permissions.sales ? 1 : 0,
        permissions.members ? 1 : 0,
        permissions.users ? 1 : 0,
        permissions.settings ? 1 : 0,
        permissions.stockAdj ? 1 : 0,
        permissions.refunds ? 1 : 0,
        permissions.shifts ? 1 : 0,
        permissions.purchaseOrders ? 1 : 0,
        permissions.analytics ? 1 : 0,
        permissions.kds ? 1 : 0,
        permissions.giftCards ? 1 : 0
      ]
    );

    res.status(201).json({ success: true, message: "User created", userId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// /admin/users/:id/disable disable user
router.patch("/users/:id/disable", async (req, res) => {
  try {
    await query("UPDATE users SET is_active = 0 WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "User disabled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// /admin/users/:id/enable enable user
router.patch("/users/:id/enable", async (req, res) => {
  try {
    await query("UPDATE users SET is_active = 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "User enabled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// /admin/branches/users get branches with assigned users
router.get("/branches/users", requireRole("admin"), async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) {
      return res.status(400).json({ success: false, message: "business_id is required" });
    }

    const branches = await query(
      `SELECT
         bb.id,
         bb.business_id,
         bb.name,
         bb.slug,
         bb.phone,
         bb.email,
         bb.address,
         bb.is_main,
         bb.is_active,
         COUNT(u.id) AS users_count
       FROM business_branches bb
       LEFT JOIN users u ON u.branch_id = bb.id
       WHERE bb.business_id = ?
       GROUP BY bb.id, bb.business_id, bb.name, bb.slug, bb.phone, bb.email, bb.address, bb.is_main, bb.is_active
       ORDER BY bb.is_main DESC, bb.name ASC`,
      [businessId]
    );

    const users = await query(
      `SELECT id, name, email, avatar, role, is_active, business_id, branch_id
       FROM users
       WHERE business_id = ?
       ORDER BY name ASC`,
      [businessId]
    );

    const usersByBranch = users.reduce((acc, user) => {
      const key = user.branch_id || "unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        is_active: !!user.is_active,
        business_id: user.business_id,
        branch_id: user.branch_id
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        branches: branches.map((branch) => ({
          ...branch,
          is_main: !!branch.is_main,
          is_active: !!branch.is_active,
          users_count: Number(branch.users_count || 0),
          users: usersByBranch[branch.id] || []
        })),
        unassigned_users: usersByBranch.unassigned || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// /admin/users/:id/branch get user's branch and available branches
router.get("/users/:id/branch", requireRole("admin"), async (req, res) => {
  try {
    const users = await query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.business_id,
         u.branch_id,
         bb.business_id AS branch_business_id,
         bb.name AS branch_name,
         bb.slug AS branch_slug,
         bb.is_main AS branch_is_main,
         bb.is_active AS branch_is_active
       FROM users u
       LEFT JOIN business_branches bb ON bb.id = u.branch_id
       WHERE u.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];
    const businessId = req.query.business_id || user.business_id || req.user.business_id;
    const branches = businessId
      ? await query(
          `SELECT id, business_id, name, slug, is_main, is_active
           FROM business_branches
           WHERE business_id = ?
           ORDER BY is_main DESC, name ASC`,
          [businessId]
        )
      : [];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          business_id: user.business_id,
          branch_id: user.branch_id,
          branch: formatBranch(user)
        },
        branches: branches.map((branch) => ({
          ...branch,
          is_main: !!branch.is_main,
          is_active: !!branch.is_active
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// /admin/users/:id/branch assign or update user's branch
router.put("/users/:id/branch", requireRole("admin"), async (req, res) => {
  try {
    const { branch_id, business_id } = req.body;
    const nextBranchId = branch_id === null || branch_id === "" ? null : Number(branch_id);

    if (branch_id !== null && branch_id !== "" && (!Number.isInteger(nextBranchId) || nextBranchId <= 0)) {
      return res.status(400).json({ success: false, message: "branch_id must be a valid branch id or null" });
    }

    const users = await query("SELECT id, name, business_id FROM users WHERE id = ? LIMIT 1", [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let nextBusinessId = business_id || users[0].business_id || req.user.business_id || null;
    let branch = null;

    if (nextBranchId) {
      const branches = await query(
        `SELECT id, business_id, name, slug, is_main, is_active
         FROM business_branches
         WHERE id = ? AND is_active = 1
         LIMIT 1`,
        [nextBranchId]
      );

      if (!branches.length) {
        return res.status(400).json({ success: false, message: "Branch not found" });
      }

      branch = branches[0];
      nextBusinessId = branch.business_id;
    }

    await query(
      "UPDATE users SET business_id = ?, branch_id = ? WHERE id = ?",
      [nextBusinessId, nextBranchId, req.params.id]
    );

    res.json({
      success: true,
      message: "User branch updated",
      data: {
        user_id: Number(req.params.id),
        business_id: nextBusinessId,
        branch_id: nextBranchId,
        branch: branch
          ? {
              id: branch.id,
              business_id: branch.business_id,
              name: branch.name,
              slug: branch.slug,
              is_main: !!branch.is_main,
              is_active: !!branch.is_active
            }
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// /admin/users/:id/pin override user's PIN/password hash
router.patch("/users/:id/pin", requireRole("admin"), async (req, res) => {
  try {
    const pin = req.body.pin || req.body.password;
    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ success: false, message: "New PIN/password must be at least 4 characters" });
    }

    const users = await query("SELECT id FROM users WHERE id = ? LIMIT 1", [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const pinHash = await bcrypt.hash(String(pin), 10);
    await query("UPDATE users SET pin_hash = ? WHERE id = ?", [pinHash, req.params.id]);

    res.json({
      success: true,
      message: "User PIN/password updated",
      data: {
        user_id: Number(req.params.id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// /admin/users/:id/delete delete user
router.delete("/users/:id", async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/users/sync-permissions", async (req, res) => {
  try {
    const users = await query(`
      SELECT id, role, name, email
      FROM users
    `);

    let createdRows = 0;
    let updatedAdmins = 0;
    let checkedUsers = 0;

    for (const user of users) {
      checkedUsers++;

      const existingPermission = await query(
        `SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1`,
        [user.id]
      );

      const isAdmin = user.role === "admin";

      // if no permission row exists
      if (!existingPermission.length) {
        await query(
          `
          INSERT INTO user_permissions (
            user_id,
            pos,
            courts,
            inventory,
            sales,
            members,
            users,
            settings,
            stockAdj,
            refunds,
            shifts,
            purchaseOrders,
            analytics,
            kds,
            giftCards
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            user.id,
            ...(isAdmin ? allTruePermissions() : allFalsePermissions())
          ]
        );

        createdRows++;
        continue;
      }

      // if admin, force all permissions to true
      if (isAdmin) {
        await query(
          `
          UPDATE user_permissions
          SET
            pos = 1,
            courts = 1,
            inventory = 1,
            sales = 1,
            members = 1,
            users = 1,
            settings = 1,
            stockAdj = 1,
            refunds = 1,
            shifts = 1,
            purchaseOrders = 1,
            analytics = 1,
            kds = 1,
            giftCards = 1
          WHERE user_id = ?
          `,
          [user.id]
        );

        updatedAdmins++;
      }
    }

    return res.json({
      success: true,
      message: "Permissions synced successfully",
      summary: {
        checkedUsers,
        createdRows,
        updatedAdmins
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


module.exports = router;
