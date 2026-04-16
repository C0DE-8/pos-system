import { useMemo, useState } from "react";
import BranchComparison from "./reports/BranchComparison";
import BranchSalesChart from "./reports/BranchSalesChart";
import CashierPerformance from "./reports/CashierPerformance";
import DashboardSummary from "./reports/DashboardSummary";
import DigitalCustomerOrders from "./reports/DigitalCustomerOrders";
import InventorySnapshot from "./reports/InventorySnapshot";
import SalesTrendChart from "./reports/SalesTrendChart";
import SalesTrends from "./reports/SalesTrends";
import TopProducts from "./reports/TopProducts";
import styles from "./ReportsManagement.module.css";

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
  if (range === "30d") return { start: formatDateInput(addDays(now, -29)), end };
  return { start: formatDateInput(addDays(now, -6)), end };
}

export default function ReportsManagement() {
  const [range, setRange] = useState("7d");
  const defaultRange = getDefaultDateRange("7d");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    if (nextRange !== "custom") {
      const defaults = getDefaultDateRange(nextRange);
      setStartDate(defaults.start);
      setEndDate(defaults.end);
    }
  };

  const reportParams = useMemo(() => {
    if (range === "custom") return { start: startDate, end: endDate };
    return { range, start: startDate, end: endDate };
  }, [range, startDate, endDate]);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2>Analytics Reports</h2>
          <p>Business and branch scoped analytics from the backend reports API.</p>
        </div>
        <select value={range} onChange={(e) => handleRangeChange(e.target.value)} className={styles.select}>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>
        <div className={styles.dateInputs}>
          <label className={styles.dateField}>
            <span>Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
            />
          </label>
          <label className={styles.dateField}>
            <span>End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </label>
        </div>
      </div>

      <DashboardSummary params={reportParams} />

      <div className={styles.tables}>
        <SalesTrendChart params={reportParams} />
        <BranchSalesChart params={reportParams} />
        <SalesTrends params={reportParams} />
        <TopProducts params={reportParams} />
        <CashierPerformance params={reportParams} />
        <BranchComparison params={reportParams} />
        <InventorySnapshot />
        <DigitalCustomerOrders params={reportParams} />
      </div>
    </div>
  );
}
