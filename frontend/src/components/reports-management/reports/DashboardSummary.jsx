import { useEffect, useState } from "react";
import { getDashboardReport } from "../../../api/reportsApi";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function DashboardSummary({ params }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const response = await getDashboardReport(params);
        if (active) setDashboard(response?.data || null);
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [params]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h4>Total Sales</h4>
        <p>{loading ? "..." : formatMoney(dashboard?.total_sales_amount)}</p>
      </div>
      <div className={styles.card}>
        <h4>Orders</h4>
        <p>{loading ? "..." : Number(dashboard?.total_orders_count || 0)}</p>
      </div>
      <div className={styles.card}>
        <h4>Average Order Value</h4>
        <p>{loading ? "..." : formatMoney(dashboard?.average_order_value)}</p>
      </div>
      <div className={styles.card}>
        <h4>Refunded</h4>
        <p>{loading ? "..." : formatMoney(dashboard?.refunded_amount)}</p>
      </div>
    </div>
  );
}
