// src/components/quick-actions/QuickActions.jsx
import styles from "./QuickActions.module.css";

export default function QuickActions({ actions }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Quick Actions</h3>
      </div>

      <div className={styles.quickActions}>
        {actions.map((action) => (
          <button key={action} className={styles.actionBtn}>
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}