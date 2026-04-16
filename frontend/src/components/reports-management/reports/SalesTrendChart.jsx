import { useEffect, useState } from "react";
import { getSalesTrendsReport } from "../../../api/reportsApi";
import BarChartCard from "./BarChartCard";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function SalesTrendChart({ params }) {
  const [salesTrends, setSalesTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSalesTrendChart() {
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

    loadSalesTrendChart();
    return () => {
      active = false;
    };
  }, [params]);

  if (loading || error) {
    return (
      <section className={styles.tableCard}>
        <h3>Sales Trend Chart</h3>
        <p className={styles.chartSubtitle}>Visual trend of net sales by time bucket.</p>
        <SectionStatus styles={styles} loading={loading} error={error} />
      </section>
    );
  }

  return (
    <BarChartCard
      styles={styles}
      title="Sales Trend Chart"
      subtitle="Visual trend of net sales by time bucket."
      data={salesTrends}
      valueKey="net_sales"
      labelKey="bucket"
      formatter={formatMoney}
    />
  );
}
