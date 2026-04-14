import { useEffect, useState } from "react";
import {
  getDashboardReport,
  getSalesTrendsReport,
  getProductsReport,
  getCashiersReport,
  getInventoryReport,
  getCustomerOrdersReport,
  getBranchesReport
} from "../../api/reportsApi";
import styles from "./ReportsManagement.module.css";

export default function ReportsManagement() {
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [salesTrends, setSalesTrends] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [inventory, setInventory] = useState({ products: [], movements: [] });
  const [customerOrders, setCustomerOrders] = useState({ orders: [], popular_items: [] });
  const [branches, setBranches] = useState([]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { range };
      const [d, t, p, c, i, o, b] = await Promise.all([
        getDashboardReport(params),
        getSalesTrendsReport({ ...params, group_by: "day" }),
        getProductsReport(params),
        getCashiersReport(params),
        getInventoryReport({}),
        getCustomerOrdersReport(params),
        getBranchesReport(params)
      ]);
      setDashboard(d?.data || null);
      setSalesTrends(t?.data || []);
      setProducts(p?.data?.top_products || []);
      setCashiers(c?.data || []);
      setInventory(i?.data || { products: [], movements: [] });
      setCustomerOrders(o?.data || { orders: [], popular_items: [] });
      setBranches(b?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [range]);

  const money = (value) =>
    `₦${Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return <div className={styles.wrap}>Loading reports...</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2>Analytics Reports</h2>
          <p>Business and branch scoped analytics from the backend reports API.</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} className={styles.select}>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h4>Total Sales</h4>
          <p>{money(dashboard?.total_sales_amount)}</p>
        </div>
        <div className={styles.card}>
          <h4>Orders</h4>
          <p>{Number(dashboard?.total_orders_count || 0)}</p>
        </div>
        <div className={styles.card}>
          <h4>Average Order Value</h4>
          <p>{money(dashboard?.average_order_value)}</p>
        </div>
        <div className={styles.card}>
          <h4>Refunded</h4>
          <p>{money(dashboard?.refunded_amount)}</p>
        </div>
      </div>

      <div className={styles.tables}>
        <section className={styles.tableCard}>
          <h3>Sales Trends</h3>
          <table>
            <thead>
              <tr><th>Bucket</th><th>Gross</th><th>Net</th><th>Orders</th></tr>
            </thead>
            <tbody>
              {salesTrends.map((row) => (
                <tr key={row.bucket}>
                  <td>{row.bucket}</td>
                  <td>{money(row.gross_sales)}</td>
                  <td>{money(row.net_sales)}</td>
                  <td>{row.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.tableCard}>
          <h3>Top Products</h3>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((row, idx) => (
                <tr key={`${row.item_name}-${idx}`}>
                  <td>{row.item_name}</td>
                  <td>{row.qty}</td>
                  <td>{money(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.tableCard}>
          <h3>Cashier Performance</h3>
          <table>
            <thead>
              <tr><th>Cashier</th><th>Sales</th><th>Transactions</th></tr>
            </thead>
            <tbody>
              {cashiers.map((row) => (
                <tr key={row.cashier_id}>
                  <td>{row.name}</td>
                  <td>{money(row.sales_total)}</td>
                  <td>{row.transaction_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.tableCard}>
          <h3>Branch Comparison</h3>
          <table>
            <thead>
              <tr><th>Branch</th><th>Sales</th><th>Orders</th></tr>
            </thead>
            <tbody>
              {branches.map((row) => (
                <tr key={row.branch_id}>
                  <td>{row.branch_name}</td>
                  <td>{money(row.sales_total)}</td>
                  <td>{row.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.tableCard}>
          <h3>Inventory Snapshot</h3>
          <p>Products: {inventory?.products?.length || 0}</p>
          <p>Movements: {inventory?.movements?.length || 0}</p>
        </section>

        <section className={styles.tableCard}>
          <h3>Digital Customer Orders</h3>
          <p>Orders: {customerOrders?.orders?.length || 0}</p>
          <p>Popular items: {customerOrders?.popular_items?.length || 0}</p>
        </section>
      </div>
    </div>
  );
}
