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

const reportTabs = [
  { id: "sales-trend-chart", label: "Sales Trend Chart", render: (params) => <SalesTrendChart params={params} /> },
  { id: "branch-sales-chart", label: "Branch Sales Chart", render: (params) => <BranchSalesChart params={params} /> },
  { id: "sales-trends", label: "Sales Trends", render: (params) => <SalesTrends params={params} /> },
  { id: "top-products", label: "Top Products", render: (params) => <TopProducts params={params} /> },
  { id: "cashier-performance", label: "Cashier Performance", render: (params) => <CashierPerformance params={params} /> },
  { id: "branch-comparison", label: "Branch Comparison", render: (params) => <BranchComparison params={params} /> },
  { id: "inventory-snapshot", label: "Inventory Snapshot", render: () => <InventorySnapshot /> },
  { id: "digital-customer-orders", label: "Digital Customer Orders", render: (params) => <DigitalCustomerOrders params={params} /> }
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
  if (range === "30d") return { start: formatDateInput(addDays(now, -29)), end };
  return { start: formatDateInput(addDays(now, -6)), end };
}

export default function ReportsManagement() {
  const [range, setRange] = useState("7d");
  const defaultRange = getDefaultDateRange("7d");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activeReportId, setActiveReportId] = useState(reportTabs[0].id);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

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
  const activeReport = reportTabs.find((tab) => tab.id === activeReportId) || reportTabs[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.reportTabs} role="tablist" aria-label="Report sections">
        {reportTabs.map((tab) => {
          const isActive = tab.id === activeReport.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              className={`${styles.reportTab} ${isActive ? styles.reportTabActive : ""}`}
              onClick={() => setActiveReportId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={styles.head}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => setIsReportsModalOpen(true)}
        >
          Analytics Reports
        </button>
        <span className={styles.activeRange}>
          {startDate} to {endDate}
        </span>
      </div>

      {isReportsModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsReportsModalOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h2 id="reports-settings-title">Analytics Reports</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsReportsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className={styles.modalBody}>
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
          </div>
        </div>
      ) : null}

      <div
        id={`${activeReport.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeReport.id}-tab`}
        className={styles.reportPanel}
      >
        {activeReport.render(reportParams)}
      </div>

      <DashboardSummary params={reportParams} />
    </div>
  );
}
