import styles from "./CustomerOrderCard.module.css";

export default function CustomerOrderCard({ order, onOpen, onHold, onResume, onCheckout }) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <strong>{order.order_code}</strong>
        <span>{order.fulfillment_status}</span>
      </div>
      <p>{order.customer_name || "Walk-in"} • {order.customer_phone || "-"}</p>
      <p>{order.order_type} • {order.items_count || 0} item(s)</p>
      <p>₦{Number(order.total || 0).toLocaleString("en-NG")}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => onOpen(order)}>Open</button>
        <button type="button" onClick={() => onHold(order)}>Hold</button>
        <button type="button" onClick={() => onResume(order)}>Resume</button>
        <button type="button" onClick={() => onCheckout(order)}>Checkout</button>
      </div>
    </div>
  );
}
