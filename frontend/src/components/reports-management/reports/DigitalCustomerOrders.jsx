import { useEffect, useState } from "react";
import { getCustomerOrdersReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function DigitalCustomerOrders({ params }) {
  const [customerOrders, setCustomerOrders] = useState({ orders: [], popular_items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDigitalCustomerOrders() {
      try {
        setLoading(true);
        setError("");
        const response = await getCustomerOrdersReport(params);
        if (active) setCustomerOrders(response?.data || { orders: [], popular_items: [] });
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDigitalCustomerOrders();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <section className={styles.tableCard}>
      <h3>Digital Customer Orders</h3>
      {loading || error ? (
        <SectionStatus styles={styles} loading={loading} error={error} />
      ) : (
        <>
          <p>Orders: {customerOrders?.orders?.length || 0}</p>
          <p>Popular items: {customerOrders?.popular_items?.length || 0}</p>
        </>
      )}
    </section>
  );
}
