import { useEffect, useMemo, useState } from "react";
import { getSettings, updateSettings } from "../../api/settingsApi";
import styles from "./SettingsManagement.module.css";

const initialForm = {
  currency: "NGN",
  tax_rate: "",
  biz_name: "",
  biz_addr: "",
  biz_phone: "",
  footer: "",
  low_stock: "",
  loyalty_earn_rate: "",
  loyalty_redeem_rate: ""
};

const currencyOptions = ["NGN", "USD", "GBP", "EUR", "GHS", "ZAR", "KES"];

export default function SettingsManagement() {
  const [form, setForm] = useState(initialForm);
  const [originalSettings, setOriginalSettings] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getSettings();
      const settings = res?.data || initialForm;

      const normalized = {
        currency: settings.currency ?? "NGN",
        tax_rate: settings.tax_rate ?? "",
        biz_name: settings.biz_name ?? "",
        biz_addr: settings.biz_addr ?? "",
        biz_phone: settings.biz_phone ?? "",
        footer: settings.footer ?? "",
        low_stock: settings.low_stock ?? "",
        loyalty_earn_rate: settings.loyalty_earn_rate ?? "",
        loyalty_redeem_rate: settings.loyalty_redeem_rate ?? ""
      };

      setForm(normalized);
      setOriginalSettings(normalized);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setForm(originalSettings);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        currency: form.currency,
        tax_rate: Number(form.tax_rate || 0),
        biz_name: form.biz_name.trim(),
        biz_addr: form.biz_addr.trim(),
        biz_phone: form.biz_phone.trim(),
        footer: form.footer.trim(),
        low_stock: Number(form.low_stock || 0),
        loyalty_earn_rate: Number(form.loyalty_earn_rate || 0),
        loyalty_redeem_rate: Number(form.loyalty_redeem_rate || 0)
      };

      await updateSettings(payload);
      setSuccessMessage("Settings updated successfully");
      setOriginalSettings(form);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    return [
      {
        title: "Currency",
        value: form.currency || "NGN",
        note: "System money format"
      },
      {
        title: "Tax Rate",
        value: `${Number(form.tax_rate || 0)}%`,
        note: "Default tax percentage"
      },
      {
        title: "Low Stock Alert",
        value: Number(form.low_stock || 0),
        note: "Minimum stock threshold"
      },
      {
        title: "Loyalty Redeem",
        value: Number(form.loyalty_redeem_rate || 0),
        note: "Points needed for redemption"
      }
    ];
  }, [form]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loaderCard}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topGrid}>
        {stats.map((item) => (
          <div key={item.title} className={styles.statCard}>
            <h3>{item.title}</h3>
            <p>{item.value}</p>
            <span>{item.note}</span>
          </div>
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.title}>System Settings</h2>
            <p className={styles.subtitle}>
              Manage business info, tax, stock alert, and loyalty values
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={fetchSettings}
              disabled={saving}
            >
              Refresh
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </button>
          </div>
        </div>

        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {successMessage ? (
          <div className={styles.successBox}>{successMessage}</div>
        ) : null}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Business Information</h3>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Business Name</label>
                <input
                  type="text"
                  name="biz_name"
                  value={form.biz_name}
                  onChange={handleChange}
                  placeholder="Enter business name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Business Phone</label>
                <input
                  type="text"
                  name="biz_phone"
                  value={form.biz_phone}
                  onChange={handleChange}
                  placeholder="Enter business phone"
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Business Address</label>
                <input
                  type="text"
                  name="biz_addr"
                  value={form.biz_addr}
                  onChange={handleChange}
                  placeholder="Enter business address"
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Receipt Footer</label>
                <textarea
                  name="footer"
                  value={form.footer}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter receipt footer text"
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>System Configuration</h3>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Currency</label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  value={form.tax_rate}
                  onChange={handleChange}
                  placeholder="Enter tax rate"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Low Stock Alert</label>
                <input
                  type="number"
                  name="low_stock"
                  value={form.low_stock}
                  onChange={handleChange}
                  placeholder="Enter low stock threshold"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Loyalty Earn Rate</label>
                <input
                  type="number"
                  name="loyalty_earn_rate"
                  value={form.loyalty_earn_rate}
                  onChange={handleChange}
                  placeholder="Enter loyalty earn rate"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Loyalty Redeem Rate</label>
                <input
                  type="number"
                  name="loyalty_redeem_rate"
                  value={form.loyalty_redeem_rate}
                  onChange={handleChange}
                  placeholder="Enter loyalty redeem rate"
                />
              </div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleReset}
              disabled={saving}
            >
              Cancel Changes
            </button>

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}