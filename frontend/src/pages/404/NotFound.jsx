import { useNavigate } from "react-router-dom";
import { FiHome, FiAlertTriangle } from "react-icons/fi";
import styles from "./NotFound.module.css";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <FiAlertTriangle className={styles.icon} />

        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>

        <p className={styles.text}>
          The page you are looking for does not exist or may have been moved.
        </p>

        <button
          className={styles.button}
          onClick={() => navigate("/dashboard")}
        >
          <FiHome />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}