import Sidebar from "../../components/sidebar/Sidebar";
import styles from "./Members.module.css";

export default function Members() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Members</h1>
        <p className={styles.text}>Members page connected to /members route.</p>
      </main>
    </div>
  );
}