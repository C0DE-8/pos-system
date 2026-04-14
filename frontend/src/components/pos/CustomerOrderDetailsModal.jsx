import styles from "./CustomerOrderDetailsModal.module.css";

const STATUSES = ["confirmed", "preparing", "ready", "completed", "cancelled"];

export default function CustomerOrderDetailsModal({
  orderDetails,
  onClose,
  onSendToCheckout,
  onUpdateStatus
}) {
  if (!orderDetails) return null;
  const { order, items } = orderDetails;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h3>{order.order_code}</h3>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <p>{order.customer_name || "Walk-in"} • {order.customer_phone || "-"}</p>
        <p>{order.order_type} • {order.fulfillment_status}</p>
        <div className={styles.items}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span>{item.icon || "🍽️"} {item.item_name} x{item.qty}</span>
              <strong>₦{Number(item.final_price || 0).toLocaleString("en-NG")}</strong>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onSendToCheckout}>Send to POS Checkout</button>
          {STATUSES.map((status) => (
            <button key={status} type="button" onClick={() => onUpdateStatus(status)}>
              Mark {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
