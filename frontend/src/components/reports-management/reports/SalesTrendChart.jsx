import { useEffect, useState } from "react";
import { getSalesTrendsReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

function compactMoney(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `₦${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `₦${(number / 1000).toFixed(0)}K`;
  return `₦${number.toFixed(0)}`;
}

function formatBucketLabel(bucket) {
  if (!bucket) return "N/A";
  const parsed = new Date(`${bucket}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return bucket;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
        <p className={styles.chartSubtitle}>Net sales trend from the selected start date to end date.</p>
        <SectionStatus styles={styles} loading={loading} error={error} />
      </section>
    );
  }

  const maxValue = Math.max(...salesTrends.map((row) => Number(row?.net_sales || 0)), 0);
  const totalSales = salesTrends.reduce((sum, row) => sum + Number(row?.net_sales || 0), 0);
  const totalOrders = salesTrends.reduce((sum, row) => sum + Number(row?.order_count || 0), 0);
  const averageSales = salesTrends.length ? totalSales / salesTrends.length : 0;
  const levelMax = maxValue > 0 ? maxValue : 1;
  const levels = [1, 0.75, 0.5, 0.25, 0].map((level) => levelMax * level);

  return (
    <section className={styles.tableCard}>
      <div className={styles.trendChartHead}>
        <div>
          <h3>Sales Trend Chart</h3>
          <p className={styles.chartSubtitle}>Net sales trend from the selected start date to end date.</p>
        </div>
        <div className={styles.trendStats}>
          <span>Total {formatMoney(totalSales)}</span>
          <span>Average {formatMoney(averageSales)}</span>
          <span>Orders {totalOrders}</span>
        </div>
      </div>

      {!salesTrends.length ? (
        <SectionStatus styles={styles} empty />
      ) : (
        <div className={styles.trendChartViewport}>
          <div className={styles.trendChart}>
            <div className={styles.trendLevels} aria-hidden="true">
              {levels.map((level) => (
                <span key={level}>{compactMoney(level)}</span>
              ))}
            </div>
            <div className={styles.trendPlot}>
              <div className={styles.trendGrid} aria-hidden="true">
                {levels.map((level) => (
                  <span key={level} />
                ))}
              </div>
              <div className={styles.trendBars}>
                {salesTrends.map((row) => {
                  const value = Number(row?.net_sales || 0);
                  const heightPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 2;
                  return (
                    <div key={row.bucket} className={styles.trendBarItem}>
                      <div className={styles.trendBarValue}>{compactMoney(value)}</div>
                      <div className={styles.trendBarWrap}>
                        <div className={styles.trendBar} style={{ height: `${heightPercent}%` }} />
                      </div>
                      <div className={styles.trendBarLabel}>{formatBucketLabel(row.bucket)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
