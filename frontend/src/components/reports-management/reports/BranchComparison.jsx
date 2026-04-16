import { useEffect, useState } from "react";
import { getBranchesReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function BranchComparison({ params }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBranchComparison() {
      try {
        setLoading(true);
        setError("");
        const response = await getBranchesReport(params);
        if (active) setBranches(response?.data || []);
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBranchComparison();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <section className={styles.tableCard}>
      <h3>Branch Comparison</h3>
      {loading || error || !branches.length ? (
        <SectionStatus styles={styles} loading={loading} error={error} empty={!branches.length} />
      ) : (
        <table>
          <thead>
            <tr><th>Branch</th><th>Sales</th><th>Orders</th></tr>
          </thead>
          <tbody>
            {branches.map((row) => (
              <tr key={row.branch_id}>
                <td>{row.branch_name}</td>
                <td>{formatMoney(row.sales_total)}</td>
                <td>{row.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
