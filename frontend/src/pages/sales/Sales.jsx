import Sidebar from "../../components/sidebar/Sidebar";
import styles from "./Sales.module.css";

export default function Sales() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Sales</h1>
        <p className={styles.text}>Sales page connected to /sales route.</p>
      </main>
    </div>
  );
}