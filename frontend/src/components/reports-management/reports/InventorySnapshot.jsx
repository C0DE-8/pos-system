import { useEffect, useState } from "react";
import { getInventoryReport } from "../../../api/reportsApi";
import SectionStatus from "./SectionStatus";
import { getReportErrorMessage } from "./reportFormatters";
import styles from "../ReportsManagement.module.css";

export default function InventorySnapshot() {
  const [inventory, setInventory] = useState({ products: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInventorySnapshot() {
      try {
        setLoading(true);
        setError("");
        const response = await getInventoryReport({});
        if (active) setInventory(response?.data || { products: [], movements: [] });
      } catch (err) {
        if (active) setError(getReportErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInventorySnapshot();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={styles.tableCard}>
      <h3>Inventory Snapshot</h3>
      {loading || error ? (
        <SectionStatus styles={styles} loading={loading} error={error} />
      ) : (
        <>
          <p>Products: {inventory?.products?.length || 0}</p>
          <p>Movements: {inventory?.movements?.length || 0}</p>
        </>
      )}
    </section>
  );
}
