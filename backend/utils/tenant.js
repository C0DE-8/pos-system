function isAdmin(user) {
  return user?.role === "admin" || user?.role === "owner";
}

function ensureBusinessContext(req, res) {
  if (isAdmin(req.user)) return true;
  if (req.user?.business_id) return true;

  res.status(403).json({
    success: false,
    message: "User is not assigned to a business"
  });
  return false;
}

function scopedBusinessId(req, explicitBusinessId = null) {
  if (!isAdmin(req.user)) return req.user.business_id;
  return explicitBusinessId || req.user.business_id || null;
}

function scopedBranchId(req, explicitBranchId = null) {
  if (!isAdmin(req.user)) return req.user.branch_id || null;
  if (explicitBranchId !== undefined) return explicitBranchId;
  return req.user.branch_id || null;
}

module.exports = {
  isAdmin,
  ensureBusinessContext,
  scopedBusinessId,
  scopedBranchId
};
