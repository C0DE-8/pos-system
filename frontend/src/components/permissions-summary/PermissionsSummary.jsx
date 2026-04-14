import styles from "./PermissionsSummary.module.css";

const labels = {
  pos: "POS",
  courts: "Courts",
  inventory: "Inventory",
  sales: "Sales",
  members: "Members",
  users: "Users",
  settings: "Settings",
  stockAdj: "Stock Adjustment",
  refunds: "Refunds",
  shifts: "Shifts",
  purchaseOrders: "Purchase Orders",
  analytics: "Analytics",
  kds: "KDS",
  giftCards: "Gift Cards"
};

export default function PermissionsSummary({ user, permissions = {} }) {
  const enabledPermissions =
    user?.role === "admin"
      ? ["Full system access"]
      : Object.entries(permissions)
          .filter(([, value]) => value)
          .map(([key]) => labels[key] || key);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Current User Permissions</h3>
      </div>

      <div className={styles.permissionsTable}>
        <div className={styles.permissionRow}>
          <span>Role</span>
          <span>{user?.role || "Unknown"}</span>
        </div>

        <div className={styles.permissionRow}>
          <span>Access</span>
          <span>
            {enabledPermissions.length > 0
              ? enabledPermissions.join(", ")
              : "No special permissions assigned"}
          </span>
        </div>
      </div>
    </section>
  );
}