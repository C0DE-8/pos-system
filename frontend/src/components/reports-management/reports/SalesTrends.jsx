import { useEffect, useState } from "react";
import { getSalesTrendsReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function SalesTrends({ params }) {
  const [salesTrends, setSalesTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSalesTrends() {
      try {
        setLoading(true);
        setError("");
        const response = await getSalesTrendsReport({ ...params, group_by: "day" });
        if (active) setSalesTrends(response?.data || []);
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSalesTrends();
    return () => {
      active = false;
    };
  }, [params]);

  const status = <SectionStatus styles={styles} loading={loading} error={error} empty={!salesTrends.length} />;

  return (
    <section className={styles.tableCard}>
      <h3>Sales Trends</h3>
      {loading || error || !salesTrends.length ? (
        status
      ) : (
        <table>
          <thead>
            <tr><th>Bucket</th><th>Gross</th><th>Net</th><th>Orders</th></tr>
          </thead>
          <tbody>
            {salesTrends.map((row) => (
              <tr key={row.bucket}>
                <td>{row.bucket}</td>
                <td>{formatMoney(row.gross_sales)}</td>
                <td>{formatMoney(row.net_sales)}</td>
                <td>{row.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
