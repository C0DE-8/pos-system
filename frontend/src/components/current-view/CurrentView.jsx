import styles from "./CurrentView.module.css";

export default function CurrentView({ activeMenu, permissions }) {
  const enabledPermissions = Object.keys(permissions || {}).filter(
    (key) => permissions[key]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Current View</h3>
      </div>

      <div className={styles.currentViewBox}>
        <h4>{activeMenu}</h4>
        <p>
          This section reflects the workspace you are currently viewing.
        </p>
        <p>
          Access is controlled by assigned permissions from the available
          system functions, not hardcoded frontend role menus.
        </p>
        <p>
          Active permissions:{" "}
          <strong>{enabledPermissions.join(", ") || "None"}</strong>
        </p>
      </div>
    </div>
  );
}
