import { useEffect, useMemo, useState } from "react";
import { getSettings, updateSettings } from "../../api/settingsApi";
import {
  getBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  updateBusinessStatus,
  getBusinessBranches,
  createBusinessBranch,
  updateBusinessBranch,
  updateBusinessBranchStatus
} from "../../api/businessesApi";
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
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [branches, setBranches] = useState([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);

  const [businessForm, setBusinessForm] = useState({
    id: "",
    name: "",
    slug: "",
    phone: "",
    email: "",
    address: "",
    currency: "NGN",
    tax_rate: 0,
    is_active: 1,
    logo: null
  });

  const [branchForm, setBranchForm] = useState({
    id: "",
    name: "",
    slug: "",
    phone: "",
    email: "",
    address: "",
    is_main: 0,
    is_active: 1,
    image: null
  });

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
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setBizLoading(true);
      const res = await getBusinesses();
      const rows = res?.data || [];
      setBusinesses(rows);

      if (rows.length && !selectedBusinessId) {
        const firstId = String(rows[0].id);
        setSelectedBusinessId(firstId);
        await handleSelectBusiness(firstId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load businesses");
    } finally {
      setBizLoading(false);
    }
  };

  const handleSelectBusiness = async (id) => {
    try {
      setSelectedBusinessId(String(id));
      const [bizRes, branchRes] = await Promise.all([
        getBusinessById(id),
        getBusinessBranches(id)
      ]);

      const biz = bizRes?.data;
      const branchRows = branchRes?.data || [];
      if (biz) {
        setBusinessForm({
          id: biz.id,
          name: biz.name || "",
          slug: biz.slug || "",
          phone: biz.phone || "",
          email: biz.email || "",
          address: biz.address || "",
          currency: biz.currency || "NGN",
          tax_rate: Number(biz.tax_rate || 0),
          is_active: Number(biz.is_active || 0),
          logo: null
        });
      }

      setBranches(branchRows);
      if (branchRows.length) {
        const firstBranch = branchRows[0];
        setBranchForm({
          id: firstBranch.id,
          name: firstBranch.name || "",
          slug: firstBranch.slug || "",
          phone: firstBranch.phone || "",
          email: firstBranch.email || "",
          address: firstBranch.address || "",
          is_main: Number(firstBranch.is_main || 0),
          is_active: Number(firstBranch.is_active || 0),
          image: null
        });
      } else {
        setBranchForm({
          id: "",
          name: "",
          slug: "",
          phone: "",
          email: "",
          address: "",
          is_main: 0,
          is_active: 1,
          image: null
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load business details");
    }
  };

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

  const toFormData = (obj) => {
    const fd = new FormData();
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        fd.append(key, value);
      }
    });
    return fd;
  };

  const handleCreateOrUpdateBusiness = async () => {
    try {
      setSavingBusiness(true);
      setError("");
      const payload = toFormData({
        name: businessForm.name.trim(),
        slug: businessForm.slug.trim(),
        phone: businessForm.phone.trim(),
        email: businessForm.email.trim(),
        address: businessForm.address.trim(),
        currency: businessForm.currency,
        tax_rate: Number(businessForm.tax_rate || 0),
        is_active: Number(businessForm.is_active),
        logo: businessForm.logo
      });

      if (!businessForm.name.trim()) {
        setError("Business name is required");
        return;
      }

      if (businessForm.id) {
        await updateBusiness(businessForm.id, payload);
        setSuccessMessage("Business updated successfully");
      } else {
        await createBusiness(payload);
        setSuccessMessage("Business created successfully");
      }

      await fetchBusinesses();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save business");
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleToggleBusinessStatus = async () => {
    try {
      if (!businessForm.id) return;
      await updateBusinessStatus(businessForm.id, Number(!businessForm.is_active));
      setSuccessMessage("Business status updated");
      await handleSelectBusiness(businessForm.id);
      await fetchBusinesses();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update business status");
    }
  };

  const handleCreateOrUpdateBranch = async () => {
    try {
      if (!selectedBusinessId) {
        setError("Select a business first");
        return;
      }
      setSavingBranch(true);
      setError("");

      const payload = toFormData({
        name: branchForm.name.trim(),
        slug: branchForm.slug.trim(),
        phone: branchForm.phone.trim(),
        email: branchForm.email.trim(),
        address: branchForm.address.trim(),
        is_main: Number(branchForm.is_main),
        is_active: Number(branchForm.is_active),
        image: branchForm.image
      });

      if (!branchForm.name.trim()) {
        setError("Branch name is required");
        return;
      }

      if (branchForm.id) {
        await updateBusinessBranch(selectedBusinessId, branchForm.id, payload);
        setSuccessMessage("Branch updated successfully");
      } else {
        await createBusinessBranch(selectedBusinessId, payload);
        setSuccessMessage("Branch created successfully");
      }

      await handleSelectBusiness(selectedBusinessId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save branch");
    } finally {
      setSavingBranch(false);
    }
  };

  const handleToggleBranchStatus = async () => {
    try {
      if (!selectedBusinessId || !branchForm.id) return;
      await updateBusinessBranchStatus(
        selectedBusinessId,
        branchForm.id,
        Number(!branchForm.is_active)
      );
      setSuccessMessage("Branch status updated");
      await handleSelectBusiness(selectedBusinessId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update branch status");
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

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.title}>Business & Branch Management</h2>
            <p className={styles.subtitle}>Manage businesses, logos, branches and branch status</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={fetchBusinesses} disabled={bizLoading}>
              {bizLoading ? "Loading..." : "Refresh Businesses"}
            </button>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Select Business</label>
            <select value={selectedBusinessId} onChange={(e) => handleSelectBusiness(e.target.value)}>
              <option value="">Select business</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name} ({biz.slug})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Business Logo</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, logo: e.target.files?.[0] || null }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Business Name</label>
            <input
              type="text"
              value={businessForm.name}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Business name"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Business Slug</label>
            <input
              type="text"
              value={businessForm.slug}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="business-slug"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Phone</label>
            <input
              type="text"
              value={businessForm.phone}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="text"
              value={businessForm.email}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Currency</label>
            <select
              value={businessForm.currency}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, currency: e.target.value }))}
            >
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tax Rate</label>
            <input
              type="number"
              value={businessForm.tax_rate}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, tax_rate: e.target.value }))}
            />
          </div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Address</label>
            <input
              type="text"
              value={businessForm.address}
              onChange={(e) => setBusinessForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </div>

        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryBtn} onClick={() => setBusinessForm((prev) => ({ ...prev, id: "", name: "", slug: "", phone: "", email: "", address: "", currency: "NGN", tax_rate: 0, is_active: 1, logo: null }))}>
            New Business
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleToggleBusinessStatus} disabled={!businessForm.id || savingBusiness}>
            {Number(businessForm.is_active) ? "Deactivate Business" : "Activate Business"}
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleCreateOrUpdateBusiness} disabled={savingBusiness}>
            {savingBusiness ? "Saving..." : businessForm.id ? "Update Business" : "Create Business"}
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Branches</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Select Branch</label>
              <select
                value={branchForm.id}
                onChange={(e) => {
                  const row = branches.find((b) => String(b.id) === String(e.target.value));
                  if (!row) {
                    setBranchForm({
                      id: "",
                      name: "",
                      slug: "",
                      phone: "",
                      email: "",
                      address: "",
                      is_main: 0,
                      is_active: 1,
                      image: null
                    });
                    return;
                  }
                  setBranchForm({
                    id: row.id,
                    name: row.name || "",
                    slug: row.slug || "",
                    phone: row.phone || "",
                    email: row.email || "",
                    address: row.address || "",
                    is_main: Number(row.is_main || 0),
                    is_active: Number(row.is_active || 0),
                    image: null
                  });
                }}
              >
                <option value="">New branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.slug})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Branch Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setBranchForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Branch Name</label>
              <input
                type="text"
                value={branchForm.name}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Branch Slug</label>
              <input
                type="text"
                value={branchForm.slug}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="text"
                value={branchForm.phone}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="text"
                value={branchForm.email}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Address</label>
              <input
                type="text"
                value={branchForm.address}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(Number(branchForm.is_main))}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, is_main: e.target.checked ? 1 : 0 }))}
                />
                {" "}Main Branch
              </label>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() =>
                setBranchForm({
                  id: "",
                  name: "",
                  slug: "",
                  phone: "",
                  email: "",
                  address: "",
                  is_main: 0,
                  is_active: 1,
                  image: null
                })
              }
            >
              New Branch
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={handleToggleBranchStatus} disabled={!branchForm.id || savingBranch}>
              {Number(branchForm.is_active) ? "Deactivate Branch" : "Activate Branch"}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleCreateOrUpdateBranch} disabled={savingBranch || !selectedBusinessId}>
              {savingBranch ? "Saving..." : branchForm.id ? "Update Branch" : "Create Branch"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}