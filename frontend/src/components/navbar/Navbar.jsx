// src/components/navbar/Navbar.jsx
import { FiRefreshCw, FiLogOut } from "react-icons/fi";
import styles from "./Navbar.module.css";

export default function Navbar({ user, role, title, subtitle, onRefresh, onLogout, refreshing }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1>{title}</h1>
        <p>
          Welcome back, <strong>{user?.name || "User"}</strong> — {subtitle}
        </p>
      </div>

      <div className={styles.right}>
        <button className={styles.refreshBtn} onClick={onRefresh}>
          <FiRefreshCw className={refreshing ? styles.spin : ""} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>

        <div className={styles.userBadge}>
          <div className={styles.avatar}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <strong>{user?.name || "User"}</strong>
            <small>{role}</small>
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={onLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}