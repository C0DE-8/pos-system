import { useEffect, useState } from "react";
import { getBranchesReport } from "../../../api/reportsApi";
import BarChartCard from "./BarChartCard";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function BranchSalesChart({ params }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBranchSalesChart() {
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

    loadBranchSalesChart();
    return () => {
      active = false;
    };
  }, [params]);

  if (loading || error) {
    return (
      <section className={styles.tableCard}>
        <h3>Branch Sales Chart</h3>
        <p className={styles.chartSubtitle}>Compare branch sales contribution in this range.</p>
        <SectionStatus styles={styles} loading={loading} error={error} />
      </section>
    );
  }

  return (
    <BarChartCard
      styles={styles}
      title="Branch Sales Chart"
      subtitle="Compare branch sales contribution in this range."
      data={branches}
      valueKey="sales_total"
      labelKey="branch_name"
      formatter={formatMoney}
    />
  );
}
