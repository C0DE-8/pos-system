// src/components/stat-card/StatCard.jsx
import styles from "./StatCard.module.css";

export default function StatCard({ title, value, note, icon }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.cardTop}>
        <h3>{title}</h3>
        <div className={styles.iconBox}>{icon}</div>
      </div>
      <div className={styles.cardValue}>{value}</div>
      <p>{note}</p>
    </div>
  );
}