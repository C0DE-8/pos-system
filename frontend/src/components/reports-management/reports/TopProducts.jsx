import { useEffect, useState } from "react";
import { getProductsReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function TopProducts({ params }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTopProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getProductsReport(params);
        if (active) setProducts(response?.data?.top_products || []);
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTopProducts();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <section className={styles.tableCard}>
      <h3>Top Products</h3>
      {loading || error || !products.length ? (
        <SectionStatus styles={styles} loading={loading} error={error} empty={!products.length} />
      ) : (
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {products.slice(0, 10).map((row, idx) => (
              <tr key={`${row.item_name}-${idx}`}>
                <td>{row.item_name}</td>
                <td>{row.qty}</td>
                <td>{formatMoney(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
