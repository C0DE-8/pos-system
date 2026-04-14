import styles from "./DashboardLoader.module.css";

export default function DashboardLoader() {
  return (
    <div className={styles.loaderWrapper}>
      <div className={styles.loaderContent}>
        
        <div className={styles.spinner}></div>

        <h2 className={styles.title}>P.O.S</h2>
        <p className={styles.subtitle}>Preparing your dashboard...</p>

      </div>
    </div>
  );
}