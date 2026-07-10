import { useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBox,
  FiCalendar,
  FiDollarSign,
  FiDownload,
  FiGrid,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers
} from "react-icons/fi";
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
  {
    id: "sales-trend-chart",
    label: "Sales Trend",
    description: "Daily revenue movement and order volume.",
    icon: <FiTrendingUp />,
    render: (params) => <SalesTrendChart params={params} />
  },
  {
    id: "branch-sales-chart",
    label: "Branch Sales",
    description: "Compare branch contribution across this period.",
    icon: <FiBarChart2 />,
    render: (params) => <BranchSalesChart params={params} />
  },
  {
    id: "sales-trends",
    label: "Sales Ledger",
    description: "Tabular sales trend details by date bucket.",
    icon: <FiDollarSign />,
    render: (params) => <SalesTrends params={params} />
  },
  {
    id: "top-products",
    label: "Top Products",
    description: "Best performing items by revenue and quantity.",
    icon: <FiShoppingBag />,
    render: (params) => <TopProducts params={params} />
  },
  {
    id: "cashier-performance",
    label: "Cashiers",
    description: "Cashier sales, basket size, and refunds.",
    icon: <FiUsers />,
    render: (params) => <CashierPerformance params={params} />
  },
  {
    id: "branch-comparison",
    label: "Branches",
    description: "Operational comparison between locations.",
    icon: <FiGrid />,
    render: (params) => <BranchComparison params={params} />
  },
  {
    id: "inventory-snapshot",
    label: "Inventory",
    description: "Stock snapshot and inventory movement.",
    icon: <FiBox />,
    render: () => <InventorySnapshot />
  },
  {
    id: "digital-customer-orders",
    label: "Online Orders",
    description: "Digital menu orders and popular items.",
    icon: <FiCalendar />,
    render: (params) => <DigitalCustomerOrders params={params} />
  }
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

function formatDisplayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default function ReportsManagement() {
  const [range, setRange] = useState("7d");
  const defaultRange = getDefaultDateRange("7d");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activeReportId, setActiveReportId] = useState(reportTabs[0].id);

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
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Reporting Suite</span>
          <h1>Reports Overview</h1>
          <p>Executive reporting for sales, branches, inventory, products, teams, and online ordering.</p>
        </div>

        <div className={styles.heroTools}>
          <div className={styles.rangeTabs} aria-label="Report date range">
            {[
              { value: "today", label: "Today" },
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "custom", label: "Custom" }
            ].map((option) => (
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

          <div className={styles.dateInputs}>
            <label className={styles.dateField}>
              <span>Start</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setRange("custom");
                  setStartDate(e.target.value);
                }}
                className={styles.dateInput}
              />
            </label>
            <label className={styles.dateField}>
              <span>End</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setRange("custom");
                  setEndDate(e.target.value);
                }}
                className={styles.dateInput}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={styles.periodBand}>
        <span>Active Period</span>
        <strong>{formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}</strong>
        <small>{activeReport.label}</small>
      </section>

      <DashboardSummary params={reportParams} />

      <section className={styles.workspace}>
        <aside className={styles.reportNav} aria-label="Report sections">
          <div className={styles.reportNavHead}>
            <span>Report Library</span>
            <FiDownload />
          </div>
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
                  <span className={styles.reportTabIcon}>{tab.icon}</span>
                  <span>
                    <strong>{tab.label}</strong>
                    <small>{tab.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          id={`${activeReport.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeReport.id}-tab`}
          className={styles.reportPanel}
        >
          <div className={styles.activeReportHead}>
            <span>{activeReport.icon}</span>
            <div>
              <h2>{activeReport.label}</h2>
              <p>{activeReport.description}</p>
            </div>
          </div>
          {activeReport.render(reportParams)}
        </div>
      </section>
    </div>
  );
}
