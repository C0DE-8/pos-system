import Sidebar from "../../components/sidebar/Sidebar";
import styles from "./Inventory.module.css";

export default function Inventory() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.text}>Inventory page connected to /inventory route.</p>
      </main>
    </div>
  );
}