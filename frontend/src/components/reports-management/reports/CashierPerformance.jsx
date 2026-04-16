import { useEffect, useState } from "react";
import { getCashiersReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function CashierPerformance({ params }) {
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCashierPerformance() {
      try {
        setLoading(true);
        setError("");
        const response = await getCashiersReport(params);
        if (active) setCashiers(response?.data || []);
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCashierPerformance();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <section className={styles.tableCard}>
      <h3>Cashier Performance</h3>
      {loading || error || !cashiers.length ? (
        <SectionStatus styles={styles} loading={loading} error={error} empty={!cashiers.length} />
      ) : (
        <table>
          <thead>
            <tr><th>Cashier</th><th>Sales</th><th>Transactions</th></tr>
          </thead>
          <tbody>
            {cashiers.map((row) => (
              <tr key={row.cashier_id}>
                <td>{row.name}</td>
                <td>{formatMoney(row.sales_total)}</td>
                <td>{row.transaction_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
