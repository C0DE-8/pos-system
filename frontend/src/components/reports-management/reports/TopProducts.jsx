import { useEffect, useState } from "react";
import { getProductsReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { formatMoney, getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function TopProducts({ params }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;

    async function loadTopProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getProductsReport({
          ...params,
          q: debouncedSearch,
          limit: 20
        });
        if (active) {
          const nextProducts = response?.data?.products || response?.data?.top_products || [];
          setProducts(nextProducts);
          setTotalCount(response?.data?.total_count || nextProducts.length);
        }
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
  }, [params, debouncedSearch]);

  return (
    <section className={styles.tableCard}>
      <div className={styles.reportSectionHead}>
        <div>
          <h3>Top Products</h3>
          <p className={styles.chartSubtitle}>
            Ranked product performance by revenue for the selected period.
          </p>
        </div>
        <label className={styles.searchField}>
          <span>Search product</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a product"
            className={styles.searchInput}
          />
        </label>
      </div>
      {loading || error || !products.length ? (
        <SectionStatus styles={styles} loading={loading} error={error} empty={!products.length} />
      ) : (
        <>
          <div className={styles.reportMeta}>
            Showing {products.length} of {totalCount} products
          </div>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Item</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Cost</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((row) => (
                <tr key={row.product_id}>
                  <td>#{row.rank}</td>
                  <td>{row.item_name}</td>
                  <td>{row.category_name || "Uncategorized"}</td>
                  <td>{Number(row.qty || 0)}</td>
                  <td>{Number(row.order_count || 0)}</td>
                  <td>{formatMoney(row.revenue)}</td>
                  <td>{formatMoney(row.avg_cost)}</td>
                  <td>{Number(row.is_unlimited) === 1 ? "Unlimited" : Number(row.stock || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
