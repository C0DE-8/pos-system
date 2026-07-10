import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiCreditCard,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers
} from "react-icons/fi";
import { getEmployeePerformanceReport } from "../../api/reportsApi";
import styles from "./EmployeePerformanceReport.module.css";

const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" }
];

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultDateRange(range) {
  const now = new Date();
  const end = formatDateInput(now);
  if (range === "today") return { start: end, end };
  if (range === "7d") return { start: formatDateInput(addDays(now, -6)), end };
  return { start: formatDateInput(addDays(now, -29)), end };
}

function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatDisplayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default function EmployeePerformanceReport() {
  const defaultRange = getDefaultDateRange("30d");
  const [range, setRange] = useState("30d");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    if (range === "custom") return { start: startDate, end: endDate };
    return { range, start: startDate, end: endDate };
  }, [range, startDate, endDate]);

  const employees = report?.employees || [];
  const totals = report?.totals || {};

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getEmployeePerformanceReport(params);
      setReport(res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load employee performance");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [params]);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    if (nextRange !== "custom") {
      const next = getDefaultDateRange(nextRange);
      setStartDate(next.start);
      setEndDate(next.end);
    }
  };

  const topEmployees = useMemo(() => {
    return [...employees]
      .sort((a, b) => Number(b.sales_total || 0) - Number(a.sales_total || 0))
      .slice(0, 5);
  }, [employees]);

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Authorised Reports</span>
          <h1>Employee Performance</h1>
          <p>Track sales quality, upsell activity, top-ups, wallet work, and reward operations.</p>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.rangeTabs}>
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={range === option.value ? styles.rangeActive : ""}
                onClick={() => handleRangeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={loadReport}
            aria-label="Refresh employee performance"
            title="Refresh employee performance"
            disabled={loading}
          >
            <FiRefreshCw />
          </button>
        </div>
      </section>

      <section className={styles.filterBand}>
        <label>
          <span>Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setRange("custom");
              setStartDate(event.target.value);
            }}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setRange("custom");
              setEndDate(event.target.value);
            }}
          />
        </label>
        <div className={styles.rangeLabel}>
          <span>Viewing</span>
          <strong>{formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}</strong>
        </div>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <FiTrendingUp />
          <span>Total Sales</span>
          <strong>{loading ? "..." : formatMoney(totals.sales_total)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <FiShoppingBag />
          <span>Tickets</span>
          <strong>{loading ? "..." : formatNumber(totals.ticket_count)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <FiBarChart2 />
          <span>Average Ticket</span>
          <strong>{loading ? "..." : formatMoney(totals.average_ticket_value)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <FiUsers />
          <span>Upsell Rate</span>
          <strong>{loading ? "..." : formatPercent(totals.upsell_rate)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <FiCreditCard />
          <span>Top-ups</span>
          <strong>{loading ? "..." : formatNumber(totals.topup_count)}</strong>
          <small>{formatMoney(totals.topup_total)}</small>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Performance Table</h2>
              <p>Role-based analytics for authorised users only.</p>
            </div>
          </div>

          <div className={styles.tableOuter}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Sales</th>
                  <th>Tickets</th>
                  <th>Avg Ticket</th>
                  <th>Upsell Rate</th>
                  <th>Member Attach</th>
                  <th>Top-ups</th>
                  <th>Top-up Value</th>
                  <th>Points Added</th>
                  <th>Challenges</th>
                </tr>
              </thead>
              <tbody>
                {employees.length ? (
                  employees.map((employee) => (
                    <tr key={employee.user_id}>
                      <td>
                        <strong>{employee.name || "Unnamed"}</strong>
                        <small>{employee.email || "-"}</small>
                      </td>
                      <td>{employee.role || "-"}</td>
                      <td>{formatMoney(employee.sales_total)}</td>
                      <td>{formatNumber(employee.ticket_count)}</td>
                      <td>{formatMoney(employee.average_ticket_value)}</td>
                      <td>{formatPercent(employee.upsell_rate)}</td>
                      <td>{formatPercent(employee.member_attach_rate)}</td>
                      <td>{formatNumber(employee.topup_count)}</td>
                      <td>{formatMoney(employee.topup_total)}</td>
                      <td>{formatNumber(employee.points_added)}</td>
                      <td>{formatNumber(employee.challenges_completed)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className={styles.emptyCell}>
                      {loading ? "Loading employee metrics..." : "No employee performance found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Top Staff</h2>
              <p>Ranked by tracked sales in this period.</p>
            </div>
          </div>

          <div className={styles.rankList}>
            {topEmployees.length ? (
              topEmployees.map((employee, index) => (
                <div key={employee.user_id} className={styles.rankItem}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{employee.name || "Unnamed"}</strong>
                    <small>
                      {formatMoney(employee.sales_total)} • {formatPercent(employee.upsell_rate)} upsell
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No ranking available</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
