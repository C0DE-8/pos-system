import styles from "./CustomerOrdersAlert.module.css";

export default function CustomerOrdersAlert({ counts, onOpen }) {
  const total = (counts?.new || 0) + (counts?.held || 0) + (counts?.checkout || 0);
  return (
    <button type="button" className={styles.alert} onClick={onOpen}>
      <strong>Incoming Orders</strong>
      <span>New: {counts?.new || 0}</span>
      <span>Held: {counts?.held || 0}</span>
      <span>Checkout: {counts?.checkout || 0}</span>
      <b>{total}</b>
    </button>
  );
}
