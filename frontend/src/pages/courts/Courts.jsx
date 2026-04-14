import Sidebar from "../../components/sidebar/Sidebar";
import styles from "./Courts.module.css";

export default function Courts() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Courts</h1>
        <p className={styles.text}>Courts page connected to /courts route.</p>
      </main>
    </div>
  );
} 