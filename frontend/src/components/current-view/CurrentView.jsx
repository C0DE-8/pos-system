import styles from "./CurrentView.module.css";

export default function CurrentView({ activeMenu, role, permissions }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Current View</h3>
      </div>

      <div className={styles.currentViewBox}>
        <h4>{activeMenu}</h4>
        <p>
          This section is visible because your role is <strong>{role}</strong>.
        </p>
        <p>
          Access is controlled by users permissions from the listes functions, not hardcoded
          frontend role menus.
        </p>
        <p>
          Active permissions:{" "}
          <strong>
            {role === "admin"
              ? "Full Access"
              : Object.keys(permissions || {}).filter((key) => permissions[key]).join(", ") || "None"}
          </strong>
        </p>
      </div>
    </div>
  );
}