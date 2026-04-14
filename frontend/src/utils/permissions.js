export const emptyPermissions = {
  pos: false,
  courts: false,
  inventory: false,
  sales: false,
  members: false,
  users: false,
  settings: false,
  stockAdj: false,
  refunds: false,
  shifts: false,
  purchaseOrders: false,
  analytics: false,
  kds: false,
  giftCards: false
};

export function isAdmin(user) {
  return user?.role === "admin";
}

export function normalizePermissions(user, permissions) {
  if (isAdmin(user)) {
    return {
      pos: true,
      courts: true,
      inventory: true,
      sales: true,
      members: true,
      users: true,
      settings: true,
      stockAdj: true,
      refunds: true,
      shifts: true,
      purchaseOrders: true,
      analytics: true,
      kds: true,
      giftCards: true
    };
  }

  return {
    ...emptyPermissions,
    ...(permissions || {})
  };
}

export function hasPermission(user, permissions, key) {
  if (isAdmin(user)) return true;
  return Boolean(permissions?.[key]);
}