function branchAccessMiddleware(req, res, next) {
  const requestedBranchId =
    req.params?.branchId ||
    req.body?.branch_id ||
    req.query?.branch_id;

  if (!requestedBranchId) {
    return res.status(400).json({
      success: false,
      message: "branch_id is required"
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  const role = String(req.user.role || "").toLowerCase();

  if (role === "admin" || role === "owner") {
    return next();
  }

  if (Number(req.user.branch_id) !== Number(requestedBranchId)) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to access this branch"
    });
  }

  return next();
}

module.exports = branchAccessMiddleware;