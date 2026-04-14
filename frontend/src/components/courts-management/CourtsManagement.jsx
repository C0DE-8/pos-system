import { useEffect, useMemo, useState } from "react";
import {
  getCourts,
  createCourt,
  startCourtSession,
  endCourtSession,
  extendCourtSession,
  deleteCourt
} from "../../api/courtsApi";
import { getProducts } from "../../api/productsApi";
import styles from "./CourtsManagement.module.css";

const initialForm = {
  name: "",
  icon: "🎮",
  type: "",
  mode: "timed",
  linked_product_id: ""
};

export default function CourtsManagement() {
  const [courts, setCourts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(initialForm);

  const [sessionInputs, setSessionInputs] = useState({});
  const [liveRemaining, setLiveRemaining] = useState({});

  const fetchCourts = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getCourts();
      const courtData = res?.data || [];

      setCourts(courtData);

      const remainingMap = {};
      courtData.forEach((court) => {
        remainingMap[court.id] = Number(court.remaining_seconds || 0);
      });
      setLiveRemaining(remainingMap);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load courts");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);

      const res = await getProducts();
      setProducts(res?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
    fetchProducts();
  }, []);

  // local countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveRemaining((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((key) => {
          updated[key] = Math.max(0, Number(updated[key] || 0) - 1);
        });

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const clearAlerts = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (e) => {
    const value = e.target.value;
    const selectedProduct = products.find(
      (product) => String(product.id) === String(value)
    );

    setForm((prev) => ({
      ...prev,
      linked_product_id: value,
      type: selectedProduct?.name || "",
      icon: prev.icon || "🎮"
    }));
  };

  const handleSessionInputChange = (courtId, field, value) => {
    setSessionInputs((prev) => ({
      ...prev,
      [courtId]: {
        customer: prev[courtId]?.customer || "",
        hours: prev[courtId]?.hours || "",
        minutes: prev[courtId]?.minutes || "",
        extendHours: prev[courtId]?.extendHours || "",
        extendMinutes: prev[courtId]?.extendMinutes || "",
        [field]: value
      }
    }));
  };

  const handleCreateCourt = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Court name is required");
      return;
    }

    if (!form.linked_product_id) {
      setError("Please select a linked product");
      return;
    }

    try {
      setSubmitting(true);
      clearAlerts();

      await createCourt({
        name: form.name.trim(),
        icon: form.icon.trim() || "🎮",
        type: form.type.trim(),
        mode: form.mode,
        linked_product_id: Number(form.linked_product_id)
      });

      setForm(initialForm);
      setSuccessMessage("Court created successfully");
      await fetchCourts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create court");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCourt = async (courtId) => {
    const customer = sessionInputs[courtId]?.customer?.trim();
    const hours = Number(sessionInputs[courtId]?.hours || 0);
    const minutes = Number(sessionInputs[courtId]?.minutes || 0);

    if (!customer) {
      setError("Please enter customer name before starting session");
      return;
    }

    if (hours <= 0 && minutes <= 0) {
      setError("Please enter session time before starting");
      return;
    }

    try {
      setActionLoadingId(`start-${courtId}`);
      clearAlerts();

      await startCourtSession(courtId, { customer, hours, minutes });
      setSuccessMessage("Court session started");

      setSessionInputs((prev) => ({
        ...prev,
        [courtId]: {
          customer: "",
          hours: "",
          minutes: "",
          extendHours: "",
          extendMinutes: ""
        }
      }));

      await fetchCourts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to start session");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExtendCourt = async (courtId) => {
    const hours = Number(sessionInputs[courtId]?.extendHours || 0);
    const minutes = Number(sessionInputs[courtId]?.extendMinutes || 0);

    if (hours <= 0 && minutes <= 0) {
      setError("Please enter time to extend");
      return;
    }

    try {
      setActionLoadingId(`extend-${courtId}`);
      clearAlerts();

      await extendCourtSession(courtId, { hours, minutes });
      setSuccessMessage("Court session extended");

      setSessionInputs((prev) => ({
        ...prev,
        [courtId]: {
          ...prev[courtId],
          extendHours: "",
          extendMinutes: ""
        }
      }));

      await fetchCourts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to extend session");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEndCourt = async (courtId) => {
    try {
      setActionLoadingId(`end-${courtId}`);
      clearAlerts();

      const res = await endCourtSession(courtId);
      const endedCourt = res?.data;

      let message = "Court session ended";

      if (endedCourt?.hourly_rate) {
        message = `Court session ended. Rate: ₦${Number(
          endedCourt.hourly_rate
        ).toLocaleString()}/hr`;
      }

      setSuccessMessage(message);
      await fetchCourts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to end session");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCourt = async (courtId, courtName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${courtName}"?`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(`delete-${courtId}`);
      clearAlerts();

      await deleteCourt(courtId);
      setSuccessMessage("Court deleted successfully");
      await fetchCourts();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete court");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatCountdown = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds || 0));
    const hrs = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    return `${hrs}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(
      2,
      "0"
    )}s`;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  };

  const stats = useMemo(() => {
    const total = courts.length;
    const occupied = courts.filter((court) => court.status === "occupied").length;
    const available = courts.filter((court) => court.status !== "occupied").length;

    return { total, occupied, available };
  }, [courts]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topGrid}>
        <div className={styles.statCard}>
          <h3>Total Courts</h3>
          <p>{stats.total}</p>
          <span>All registered courts</span>
        </div>

        <div className={styles.statCard}>
          <h3>Available</h3>
          <p>{stats.available}</p>
          <span>Ready for new sessions</span>
        </div>

        <div className={styles.statCard}>
          <h3>Occupied</h3>
          <p>{stats.occupied}</p>
          <span>Currently in use</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Add New Court</h2>
              <p className={styles.subtitle}>
                Create a court and link it to a product
              </p>
            </div>
          </div>

          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {successMessage ? (
            <div className={styles.successBox}>{successMessage}</div>
          ) : null}

          <form onSubmit={handleCreateCourt} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Court Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Snooker Table 1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Icon</label>
              <input
                type="text"
                name="icon"
                value={form.icon}
                onChange={handleChange}
                placeholder="🎮"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Linked Product</label>
              <select
                name="linked_product_id"
                value={form.linked_product_id}
                onChange={handleProductChange}
                disabled={productsLoading}
              >
                <option value="">
                  {productsLoading ? "Loading products..." : "Select product"}
                </option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.icon ? `${product.icon} ` : ""}
                    {product.name}
                    {product.hourly_rate
                      ? ` - ₦${Number(product.hourly_rate).toLocaleString()}/hr`
                      : product.price
                      ? ` - ₦${Number(product.price).toLocaleString()}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Type</label>
              <input
                type="text"
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="Auto-filled from product"
                readOnly
              />
            </div>

            <div className={styles.formGroup}>
              <label>Mode</label>
              <select name="mode" value={form.mode} onChange={handleChange}>
                <option value="sports">sports</option>
                <option value="timed">timed</option>
                <option value="game">game</option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Court"}
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Courts List</h2>
              <p className={styles.subtitle}>
                Start, monitor, extend, end, or delete courts manually
              </p>
            </div>

            <button
              className={styles.secondaryBtn}
              onClick={fetchCourts}
              disabled={loading}
              type="button"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className={styles.loader}>Loading courts...</div>
          ) : courts.length === 0 ? (
            <div className={styles.emptyState}>No courts found</div>
          ) : (
            <div className={styles.courtsList}>
              {courts.map((court) => {
                const occupied = court.status === "occupied";
                const remainingSeconds = liveRemaining[court.id] || 0;
                const isEndingSoon = remainingSeconds > 0 && remainingSeconds <= 600;

                return (
                  <div key={court.id} className={styles.courtCard}>
                    <div className={styles.courtTop}>
                      <div className={styles.courtIdentity}>
                        <span className={styles.courtIcon}>{court.icon || "🎮"}</span>
                        <div>
                          <h3>{court.name}</h3>
                          <p>
                            {court.type} • {court.mode}
                          </p>
                        </div>
                      </div>

                      <div className={styles.topActions}>
                        <span
                          className={`${styles.badge} ${
                            occupied ? styles.badgeDanger : styles.badgeSuccess
                          }`}
                        >
                          {occupied ? "Occupied" : "Available"}
                        </span>

                        {!occupied ? (
                          <button
                            type="button"
                            className={styles.deleteIconBtn}
                            onClick={() => handleDeleteCourt(court.id, court.name)}
                            disabled={actionLoadingId === `delete-${court.id}`}
                            title="Delete court"
                          >
                            {actionLoadingId === `delete-${court.id}`
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.metaGrid}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Customer</span>
                        <strong className={styles.metaValue}>
                          {court.current_customer || "—"}
                        </strong>
                      </div>

                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Linked Product</span>
                        <strong className={styles.metaValue}>
                          {court.linked_product_name || "—"}
                        </strong>
                      </div>

                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Hourly Rate</span>
                        <strong className={styles.metaValue}>
                          {court.hourly_rate
                            ? `₦${Number(court.hourly_rate).toLocaleString()}`
                            : "—"}
                        </strong>
                      </div>

                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Started At</span>
                        <strong className={styles.metaValue}>
                          {formatDateTime(court.started_at)}
                        </strong>
                      </div>

                      <div className={`${styles.metaItem} ${styles.timerCard}`}>
                        <span className={styles.metaLabel}>Time Remaining</span>
                        <strong
                          className={`${styles.countdown} ${
                            isEndingSoon ? styles.countdownWarning : ""
                          }`}
                        >
                          {occupied ? formatCountdown(remainingSeconds) : "—"}
                        </strong>
                      </div>

                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>End Time</span>
                        <strong className={styles.metaValue}>
                          {formatDateTime(court.end_at)}
                        </strong>
                      </div>
                    </div>

                    {!occupied ? (
                      <div className={styles.sessionPanel}>
                        <div className={styles.inputGrid}>
                          <input
                            type="text"
                            className={styles.customerInput}
                            placeholder="Enter customer name"
                            value={sessionInputs[court.id]?.customer || ""}
                            onChange={(e) =>
                              handleSessionInputChange(
                                court.id,
                                "customer",
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            className={styles.smallInput}
                            placeholder="Hours"
                            value={sessionInputs[court.id]?.hours || ""}
                            onChange={(e) =>
                              handleSessionInputChange(
                                court.id,
                                "hours",
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            className={styles.smallInput}
                            placeholder="Minutes"
                            value={sessionInputs[court.id]?.minutes || ""}
                            onChange={(e) =>
                              handleSessionInputChange(
                                court.id,
                                "minutes",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => handleStartCourt(court.id)}
                            disabled={actionLoadingId === `start-${court.id}`}
                          >
                            {actionLoadingId === `start-${court.id}`
                              ? "Starting..."
                              : "Start Session"}
                          </button>

                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => handleDeleteCourt(court.id, court.name)}
                            disabled={actionLoadingId === `delete-${court.id}`}
                          >
                            {actionLoadingId === `delete-${court.id}`
                              ? "Deleting..."
                              : "Delete Court"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.sessionPanel}>
                        <div className={styles.extendTitle}>Extend Session</div>

                        <div className={styles.inputGrid}>
                          <input
                            type="number"
                            min="0"
                            className={styles.smallInput}
                            placeholder="Hours"
                            value={sessionInputs[court.id]?.extendHours || ""}
                            onChange={(e) =>
                              handleSessionInputChange(
                                court.id,
                                "extendHours",
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            className={styles.smallInput}
                            placeholder="Minutes"
                            value={sessionInputs[court.id]?.extendMinutes || ""}
                            onChange={(e) =>
                              handleSessionInputChange(
                                court.id,
                                "extendMinutes",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => handleExtendCourt(court.id)}
                            disabled={actionLoadingId === `extend-${court.id}`}
                          >
                            {actionLoadingId === `extend-${court.id}`
                              ? "Extending..."
                              : "Extend Time"}
                          </button>

                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => handleEndCourt(court.id)}
                            disabled={actionLoadingId === `end-${court.id}`}
                          >
                            {actionLoadingId === `end-${court.id}`
                              ? "Ending..."
                              : "End Session"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}