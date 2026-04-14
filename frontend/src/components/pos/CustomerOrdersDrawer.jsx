import CustomerOrderCard from "./CustomerOrderCard";
import styles from "./CustomerOrdersDrawer.module.css";

export default function CustomerOrdersDrawer({
  open,
  onClose,
  groupedOrders,
  onOpenOrder,
  onHold,
  onResume,
  onCheckout
}) {
  if (!open) return null;
  const sections = ["new", "held", "checkout", "preparing", "ready", "completed"];

  return (
    <div className={styles.overlay}>
      <aside className={styles.drawer}>
        <div className={styles.head}>
          <h3>Customer Orders</h3>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className={styles.body}>
          {sections.map((key) => (
            <section key={key} className={styles.section}>
              <h4>{key}</h4>
              <div className={styles.list}>
                {(groupedOrders[key] || []).map((order) => (
                  <CustomerOrderCard
                    key={order.id}
                    order={order}
                    onOpen={onOpenOrder}
                    onHold={onHold}
                    onResume={onResume}
                    onCheckout={onCheckout}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
