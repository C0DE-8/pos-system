import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import * as XLSX from "xlsx";
import {
  getMembers,
  getMembershipTiers,
  getMembershipDiscountCategories,
  createMembershipTier,
  updateMembershipTier,
  createMember,
  updateMember,
  deleteMember,
  getMemberHistory
} from "../../api/membersApi";
import MemberWalletCode from "../member-wallet-code/MemberWalletCode";
import styles from "./MembersManagement.module.css";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  birthday: "",
  preferences: "",
  offer_notes: "",
  mobile_wallet_notifications: true,
  member_status: "active",
  membership_tier_id: ""
};

const initialTierForm = {
  name: "",
  discount_pct: ""
};

export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [membershipTiers, setMembershipTiers] = useState([]);
  const [discountCategories, setDiscountCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [memberUpdating, setMemberUpdating] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [updatingTierId, setUpdatingTierId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const [form, setForm] = useState(initialForm);
  const [editingMember, setEditingMember] = useState(null);
  const [tierForm, setTierForm] = useState(initialTierForm);
  const [editingTier, setEditingTier] = useState(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSales, setMemberSales] = useState([]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const [membersRes, tiersRes, categoriesRes] = await Promise.all([
        getMembers(),
        getMembershipTiers(),
        getMembershipDiscountCategories()
      ]);

      setMembers(membersRes?.data || []);
      setMembershipTiers(tiersRes?.data || []);
      setDiscountCategories(categoriesRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleEditingMemberChange = (e) => {
    const { name, type, checked, value } = e.target;

    setEditingMember((prev) =>
      prev
        ? {
            ...prev,
            [name]: type === "checkbox" ? checked : value
          }
        : prev
    );
  };

  const handleTierChange = (e) => {
    const { name, value } = e.target;

    setTierForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTierCategoryDiscountChange = (categoryId, value) => {
    setTierForm((prev) => ({
      ...prev,
      category_discounts: {
        ...(prev.category_discounts || {}),
        [categoryId]: value
      }
    }));
  };

  const handleEditingTierChange = (e) => {
    const { name, value } = e.target;

    setEditingTier((prev) =>
      prev
        ? {
            ...prev,
            [name]: value
          }
        : prev
    );
  };

  const handleEditingTierCategoryDiscountChange = (categoryId, value) => {
    setEditingTier((prev) =>
      prev
        ? {
            ...prev,
            category_discounts: {
              ...(prev.category_discounts || {}),
              [categoryId]: value
            }
          }
        : prev
    );
  };

  const buildCategoryDiscountPayload = (discountMap = {}, defaultDiscountPct = 0) => {
    return discountCategories.map((category) => ({
      category_id: category.id,
      discount_pct: Number(discountMap[category.id] ?? defaultDiscountPct ?? 0)
    }));
  };

  const buildTierDiscountMap = (tier) => {
    const discountMap = {};

    discountCategories.forEach((category) => {
      const existing = (tier.category_discounts || []).find(
        (item) => Number(item.category_id) === Number(category.id)
      );
      discountMap[category.id] = String(
        Number(existing?.discount_pct ?? tier.discount_pct ?? 0)
      );
    });

    return discountMap;
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Member name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const res = await createMember({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        birthday: form.birthday || null,
        preferences: form.preferences.trim(),
        offer_notes: form.offer_notes.trim(),
        mobile_wallet_notifications: form.mobile_wallet_notifications,
        member_status: form.member_status,
        membership_tier_id: form.membership_tier_id
          ? Number(form.membership_tier_id)
          : null
      });

      setSuccessMessage(
        res?.memberCode
          ? `Member added successfully. Code: ${res.memberCode}`
          : "Member added successfully"
      );

      setForm(initialForm);
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create member");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingMember = (member) => {
    setEditingMember({
      id: member.id,
      member_code: member.member_code || "",
      name: member.name || "",
      phone: member.phone || "",
      email: member.email || "",
      birthday: member.birthday ? moment(member.birthday).format("YYYY-MM-DD") : "",
      preferences: member.preferences || "",
      offer_notes: member.offer_notes || "",
      mobile_wallet_notifications: Number(member.mobile_wallet_notifications ?? 1) === 1,
      member_status: member.member_status || "active",
      membership_tier_id: member.membership_tier_id ? String(member.membership_tier_id) : ""
    });
    setError("");
    setSuccessMessage("");
  };

  const cancelEditingMember = () => {
    setEditingMember(null);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();

    if (!editingMember?.id) return;

    if (!String(editingMember.name || "").trim()) {
      setError("Member name is required");
      return;
    }

    try {
      setMemberUpdating(true);
      setError("");
      setSuccessMessage("");

      const res = await updateMember(editingMember.id, {
        name: String(editingMember.name || "").trim(),
        phone: String(editingMember.phone || "").trim(),
        email: String(editingMember.email || "").trim(),
        birthday: editingMember.birthday || null,
        preferences: String(editingMember.preferences || "").trim(),
        offer_notes: String(editingMember.offer_notes || "").trim(),
        mobile_wallet_notifications: editingMember.mobile_wallet_notifications,
        member_status: editingMember.member_status,
        membership_tier_id: editingMember.membership_tier_id
          ? Number(editingMember.membership_tier_id)
          : null
      });

      setSuccessMessage(
        res?.data?.name ? `Member updated: ${res.data.name}` : "Member updated successfully"
      );
      setEditingMember(null);
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update member");
    } finally {
      setMemberUpdating(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!member?.id) return;

    const confirmed = window.confirm(
      `Delete ${member.name || "this member"}? Sales history will remain, but the member profile will be removed.`
    );

    if (!confirmed) return;

    try {
      setDeletingMemberId(member.id);
      setError("");
      setSuccessMessage("");

      const res = await deleteMember(member.id);
      setSuccessMessage(res?.message || "Member deleted");

      if (editingMember?.id === member.id) {
        setEditingMember(null);
      }

      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete member");
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleCreateTier = async (e) => {
    e.preventDefault();

    if (!tierForm.name.trim()) {
      setError("Tier name is required");
      return;
    }

    try {
      setTierSubmitting(true);
      setError("");
      setSuccessMessage("");

      const res = await createMembershipTier({
        name: tierForm.name.trim(),
        discount_pct: Number(tierForm.discount_pct || 0),
        category_discounts: buildCategoryDiscountPayload(
          tierForm.category_discounts || {},
          Number(tierForm.discount_pct || 0)
        )
      });

      setSuccessMessage(
        res?.data?.name
          ? `Membership tier created: ${res.data.name}`
          : "Membership tier created successfully"
      );

      setTierForm(initialTierForm);
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create membership tier");
    } finally {
      setTierSubmitting(false);
    }
  };

  const startEditingTier = (tier) => {
    setEditingTier({
      id: tier.id,
      name: tier.name || "",
      discount_pct: String(Number(tier.discount_pct || 0)),
      category_discounts: buildTierDiscountMap(tier)
    });
    setError("");
    setSuccessMessage("");
  };

  const cancelEditingTier = () => {
    setEditingTier(null);
  };

  const handleUpdateTier = async (e) => {
    e.preventDefault();

    if (!editingTier?.id) return;

    if (!String(editingTier.name || "").trim()) {
      setError("Tier name is required");
      return;
    }

    try {
      setUpdatingTierId(editingTier.id);
      setError("");
      setSuccessMessage("");

      const res = await updateMembershipTier(editingTier.id, {
        name: String(editingTier.name || "").trim(),
        discount_pct: Number(editingTier.discount_pct || 0),
        category_discounts: buildCategoryDiscountPayload(
          editingTier.category_discounts || {},
          Number(editingTier.discount_pct || 0)
        )
      });

      setSuccessMessage(
        res?.data?.name
          ? `Membership tier updated: ${res.data.name}`
          : "Membership tier updated successfully"
      );

      setEditingTier(null);
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update membership tier");
    } finally {
      setUpdatingTierId(null);
    }
  };

  const openHistoryModal = async (memberId) => {
    try {
      setHistoryLoading(true);
      setError("");
      setShowHistoryModal(true);

      const res = await getMemberHistory(memberId);
      setSelectedMember(res?.member || null);
      setMemberSales(res?.sales || []);
    } catch (err) {
      setShowHistoryModal(false);
      setError(err?.response?.data?.message || "Failed to load member history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedMember(null);
    setMemberSales([]);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        String(member.name || "").toLowerCase().includes(searchValue) ||
        String(member.phone || "").toLowerCase().includes(searchValue) ||
        String(member.email || "").toLowerCase().includes(searchValue) ||
        String(member.member_code || "").toLowerCase().includes(searchValue);

      const matchesTier =
        tierFilter === "all"
          ? true
          : String(member.tier || "").toLowerCase() === tierFilter.toLowerCase();

      return matchesSearch && matchesTier;
    });
  }, [members, search, tierFilter]);

  const tierOptions = useMemo(() => {
    const optionMap = new Map();

    membershipTiers.forEach((tier) => {
      optionMap.set(String(tier.name || "").toLowerCase(), {
        value: tier.name,
        label: `${tier.name} (${Number(tier.discount_pct || 0)}% off)`
      });
    });

    members.forEach((member) => {
      const tierName = String(member.tier || "").trim();
      if (!tierName) return;
      const key = tierName.toLowerCase();

      if (!optionMap.has(key)) {
        optionMap.set(key, {
          value: tierName,
          label: tierName
        });
      }
    });

    return Array.from(optionMap.values()).sort((a, b) =>
      a.value.localeCompare(b.value)
    );
  }, [membershipTiers, members]);

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const vip = members.filter(
      (member) => String(member.tier || "").toLowerCase() === "vip"
    ).length;
    const regular = members.filter(
      (member) => String(member.tier || "").toLowerCase() === "regular"
    ).length;

    return {
      totalMembers,
      totalTiers: membershipTiers.length,
      vip,
      regular
    };
  }, [members, membershipTiers]);

  const formatMoney = (value) => {
    return `₦${Number(value || 0).toLocaleString()}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    return moment(value).format("DD MMM YYYY, hh:mm A");
  };

  const downloadMembersExcel = () => {
    try {
      const excelData = filteredMembers.map((member) => ({
        ID: member.id,
        "Member Code": member.member_code || "",
        Name: member.name || "",
        Phone: member.phone || "",
        Email: member.email || "",
        Birthday: member.birthday ? moment(member.birthday).format("YYYY-MM-DD") : "",
        Preferences: member.preferences || "",
        "Offer Notes": member.offer_notes || "",
        "Mobile Wallet Offers":
          Number(member.mobile_wallet_notifications ?? 1) === 1 ? "Yes" : "No",
        Status: member.member_status || "active",
        Tier: member.tier || "",
        "Tier Discount %": Number(member.membership_discount_pct || 0),
        "Created At": formatDateTime(member.created_at)
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
      XLSX.writeFile(
        workbook,
        `members-report-${moment().format("YYYY-MM-DD-HH-mm")}.xlsx`
      );
    } catch (err) {
      setError("Failed to download members Excel file");
    }
  };

  const downloadMembersDoc = () => {
    try {
      const rowsHtml = filteredMembers
        .map(
          (member) => `
            <tr>
              <td>${member.id}</td>
              <td>${member.member_code || ""}</td>
              <td>${member.name || ""}</td>
              <td>${member.phone || ""}</td>
              <td>${member.email || ""}</td>
              <td>${member.birthday ? moment(member.birthday).format("YYYY-MM-DD") : ""}</td>
              <td>${member.preferences || ""}</td>
              <td>${member.offer_notes || ""}</td>
              <td>${Number(member.mobile_wallet_notifications ?? 1) === 1 ? "Yes" : "No"}</td>
              <td>${member.member_status || "active"}</td>
              <td>${member.tier || ""}</td>
              <td>${Number(member.membership_discount_pct || 0)}%</td>
              <td>${formatDateTime(member.created_at)}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>Members Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #0f172a;
              }
              h1 {
                margin-bottom: 8px;
              }
              p {
                margin-top: 0;
                color: #475569;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 10px;
                text-align: left;
                font-size: 13px;
              }
              th {
                background: #f1f5f9;
              }
            </style>
          </head>
          <body>
            <h1>Members Report</h1>
            <p>Generated on ${moment().format("DD MMM YYYY, hh:mm A")}</p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Birthday</th>
                  <th>Preferences</th>
                  <th>Offer Notes</th>
                  <th>Mobile Wallet Offers</th>
                  <th>Status</th>
                  <th>Tier</th>
                  <th>Tier Discount %</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", html], {
        type: "application/msword"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-report-${moment().format("YYYY-MM-DD-HH-mm")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download members Word document");
    }
  };

  const downloadMemberHistoryExcel = () => {
    if (!selectedMember) return;

    try {
      const memberSheet = [
        {
          ID: selectedMember.id,
          "Member Code": selectedMember.member_code || "",
          Name: selectedMember.name || "",
          Phone: selectedMember.phone || "",
          Email: selectedMember.email || "",
          Birthday: selectedMember.birthday
            ? moment(selectedMember.birthday).format("YYYY-MM-DD")
            : "",
          Preferences: selectedMember.preferences || "",
          "Offer Notes": selectedMember.offer_notes || "",
          "Mobile Wallet Offers":
            Number(selectedMember.mobile_wallet_notifications ?? 1) === 1 ? "Yes" : "No",
          Status: selectedMember.member_status || "active",
          Tier: selectedMember.tier || "",
          "Tier Discount %": Number(selectedMember.membership_discount_pct || 0),
          "Created At": formatDateTime(selectedMember.created_at)
        }
      ];

      const salesSheet = memberSales.map((sale) => ({
        "Sale ID": sale.id,
        Customer: sale.customer || sale.customer_name || "",
        Total: Number(sale.total_amount || sale.total || 0),
        Status: sale.status || "",
        "Payment Method": sale.payment_method || "",
        "Sale Date": formatDateTime(sale.sale_date || sale.created_at)
      }));

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(memberSheet),
        "Member"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(salesSheet),
        "History"
      );

      XLSX.writeFile(
        workbook,
        `member-history-${selectedMember.id}-${moment().format("YYYY-MM-DD-HH-mm")}.xlsx`
      );
    } catch (err) {
      setError("Failed to download member history Excel");
    }
  };

  const downloadMemberHistoryDoc = () => {
    if (!selectedMember) return;

    try {
      const salesRows = memberSales
        .map(
          (sale) => `
            <tr>
              <td>${sale.id}</td>
              <td>${sale.customer || sale.customer_name || ""}</td>
              <td>${formatMoney(sale.total_amount || sale.total)}</td>
              <td>${sale.status || ""}</td>
              <td>${sale.payment_method || ""}</td>
              <td>${formatDateTime(sale.sale_date || sale.created_at)}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>Member History</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #0f172a;
              }
              h1, h2 {
                margin-bottom: 10px;
              }
              .meta p {
                margin: 6px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 16px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 10px;
                text-align: left;
                font-size: 13px;
              }
              th {
                background: #f1f5f9;
              }
            </style>
          </head>
          <body>
            <h1>Member History</h1>

            <div class="meta">
              <p><strong>ID:</strong> ${selectedMember.id}</p>
              <p><strong>Member Code:</strong> ${selectedMember.member_code || ""}</p>
              <p><strong>Name:</strong> ${selectedMember.name || ""}</p>
              <p><strong>Phone:</strong> ${selectedMember.phone || ""}</p>
              <p><strong>Email:</strong> ${selectedMember.email || ""}</p>
              <p><strong>Birthday:</strong> ${
                selectedMember.birthday ? moment(selectedMember.birthday).format("YYYY-MM-DD") : ""
              }</p>
              <p><strong>Preferences:</strong> ${selectedMember.preferences || ""}</p>
              <p><strong>Offer Notes:</strong> ${selectedMember.offer_notes || ""}</p>
              <p><strong>Mobile Wallet Offers:</strong> ${
                Number(selectedMember.mobile_wallet_notifications ?? 1) === 1 ? "Yes" : "No"
              }</p>
              <p><strong>Status:</strong> ${selectedMember.member_status || "active"}</p>
              <p><strong>Tier:</strong> ${selectedMember.tier || ""}</p>
              <p><strong>Tier Discount:</strong> ${Number(
                selectedMember.membership_discount_pct || 0
              )}%</p>
              <p><strong>Created At:</strong> ${formatDateTime(selectedMember.created_at)}</p>
            </div>

            <h2>Sales History</h2>

            <table>
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment Method</th>
                  <th>Sale Date</th>
                </tr>
              </thead>
              <tbody>
                ${salesRows || '<tr><td colspan="6">No sales found</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", html], {
        type: "application/msword"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `member-history-${selectedMember.id}-${moment().format("YYYY-MM-DD-HH-mm")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download member history Word document");
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topGrid}>
        <div className={styles.statCard}>
          <h3>Total Members</h3>
          <p>{stats.totalMembers}</p>
          <span>All registered members</span>
        </div>

        <div className={styles.statCard}>
          <h3>Membership Tiers</h3>
          <p>{stats.totalTiers}</p>
          <span>Available tiers for members</span>
        </div>

        <div className={styles.statCard}>
          <h3>VIP</h3>
          <p>{stats.vip}</p>
          <span>VIP members</span>
        </div>

        <div className={styles.statCard}>
          <h3>Regular</h3>
          <p>{stats.regular}</p>
          <span>Regular members</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Add Member</h2>
              <p className={styles.subtitle}>
                Register a new member for Arena Pro
              </p>
            </div>
          </div>

          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {successMessage ? (
            <div className={styles.successBox}>{successMessage}</div>
          ) : null}

          <form onSubmit={handleCreateMember} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter member name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Birthday</label>
              <input
                type="date"
                name="birthday"
                value={form.birthday}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Preferences</label>
              <textarea
                name="preferences"
                value={form.preferences}
                onChange={handleChange}
                rows="3"
                placeholder="Favorite games, food, visit times, interests"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Offer Notes</label>
              <textarea
                name="offer_notes"
                value={form.offer_notes}
                onChange={handleChange}
                rows="3"
                placeholder="Targeted offers or promo notes for this member"
              />
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="mobile_wallet_notifications"
                checked={form.mobile_wallet_notifications}
                onChange={handleChange}
              />
              <span>Send mobile wallet notifications and special offers</span>
            </label>

            <div className={styles.formGroup}>
              <label>Membership Tier</label>
              <select
                name="membership_tier_id"
                value={form.membership_tier_id}
                onChange={handleChange}
              >
                <option value="">Select tier</option>
                {membershipTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Member Status</label>
              <select
                name="member_status"
                value={form.member_status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="pending">Pending Verification</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
            >
              {submitting ? "Adding Member..." : "Add Member"}
            </button>
          </form>

          {editingMember ? (
            <form onSubmit={handleUpdateMember} className={styles.form}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.title}>Update Member</h2>
                  <p className={styles.subtitle}>
                    Editing {editingMember.member_code || editingMember.name}
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingMember.name}
                  onChange={handleEditingMemberChange}
                  placeholder="Enter member name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={editingMember.phone}
                  onChange={handleEditingMemberChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={editingMember.email}
                  onChange={handleEditingMemberChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={editingMember.birthday}
                  onChange={handleEditingMemberChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Preferences</label>
                <textarea
                  name="preferences"
                  value={editingMember.preferences}
                  onChange={handleEditingMemberChange}
                  rows="3"
                  placeholder="Favorite games, food, visit times, interests"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Offer Notes</label>
                <textarea
                  name="offer_notes"
                  value={editingMember.offer_notes}
                  onChange={handleEditingMemberChange}
                  rows="3"
                  placeholder="Targeted offers or promo notes for this member"
                />
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="mobile_wallet_notifications"
                  checked={editingMember.mobile_wallet_notifications}
                  onChange={handleEditingMemberChange}
                />
                <span>Send mobile wallet notifications and special offers</span>
              </label>

              <div className={styles.formGroup}>
                <label>Membership Tier</label>
                <select
                  name="membership_tier_id"
                  value={editingMember.membership_tier_id}
                  onChange={handleEditingMemberChange}
                >
                  <option value="">Select tier</option>
                  {membershipTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Member Status</label>
                <select
                  name="member_status"
                  value={editingMember.member_status}
                  onChange={handleEditingMemberChange}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending Verification</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className={styles.inlineActions}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={memberUpdating}
                >
                  {memberUpdating ? "Saving Member..." : "Save Member"}
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={cancelEditingMember}
                  disabled={memberUpdating}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Create Membership Tier</h2>
              <p className={styles.subtitle}>
                Add a tier and set default category discounts
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTier} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Tier Name</label>
              <input
                type="text"
                name="name"
                value={tierForm.name}
                onChange={handleTierChange}
                placeholder="Example: Premium"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Default Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                name="discount_pct"
                value={tierForm.discount_pct}
                onChange={handleTierChange}
                placeholder="0"
              />
            </div>

            {discountCategories.length ? (
              <div className={styles.discountMatrix}>
                <div className={styles.discountMatrixHeader}>
                  <strong>Category Discounts</strong>
                  <span>Set the checkout discount for each product category.</span>
                </div>

                {discountCategories.map((category) => (
                  <label key={category.id} className={styles.discountRow}>
                    <span>
                      {category.name}
                      <small>{category.type || "other"}</small>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={
                        tierForm.category_discounts?.[category.id] ??
                        tierForm.discount_pct ??
                        ""
                      }
                      onChange={(e) =>
                        handleTierCategoryDiscountChange(category.id, e.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.secondaryBtn}
              disabled={tierSubmitting}
            >
              {tierSubmitting ? "Creating Tier..." : "Create Tier"}
            </button>
          </form>

          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Membership Tier Benefits</h2>
              <p className={styles.subtitle}>
                View existing tiers and update their discount benefits
              </p>
            </div>
          </div>

          {membershipTiers.length ? (
            <div className={styles.tierList}>
              {membershipTiers.map((tier) => (
                <div key={tier.id} className={styles.tierItem}>
                  <div>
                    <strong>{tier.name}</strong>
                    <span>
                      {tier.category_discounts?.length
                        ? `${tier.category_discounts.length} category discount(s)`
                        : `${Number(tier.discount_pct || 0)}% default discount`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => startEditingTier(tier)}
                  >
                    Update Tier
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyStateSmall}>No membership tiers found</div>
          )}

          {editingTier ? (
            <form onSubmit={handleUpdateTier} className={styles.form}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.title}>Update Tier</h2>
                  <p className={styles.subtitle}>
                    Edit the tier name and category discount benefits
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Tier Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingTier.name}
                  onChange={handleEditingTierChange}
                  placeholder="Tier name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Default Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="discount_pct"
                  value={editingTier.discount_pct}
                  onChange={handleEditingTierChange}
                  placeholder="0"
                />
              </div>

              {discountCategories.length ? (
                <div className={styles.discountMatrix}>
                  <div className={styles.discountMatrixHeader}>
                    <strong>Category Discounts</strong>
                    <span>Checkout applies these values by product category.</span>
                  </div>

                  {discountCategories.map((category) => (
                    <label key={category.id} className={styles.discountRow}>
                      <span>
                        {category.name}
                        <small>{category.type || "other"}</small>
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingTier.category_discounts?.[category.id] ?? ""}
                        onChange={(e) =>
                          handleEditingTierCategoryDiscountChange(
                            category.id,
                            e.target.value
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <div className={styles.inlineActions}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={updatingTierId === editingTier.id}
                >
                  {updatingTierId === editingTier.id
                    ? "Updating Tier..."
                    : "Save Tier"}
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={cancelEditingTier}
                  disabled={updatingTierId === editingTier.id}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.title}>Members</h2>
              <p className={styles.subtitle}>
                View, search, and export registered members
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={downloadMembersExcel}
              >
                Export Excel
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={downloadMembersDoc}
              >
                Export Word
              </button>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search name, member code, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>

            <select
              className={styles.filterSelect}
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="all">All Tiers</option>
              {tierOptions.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className={styles.loader}>Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className={styles.emptyState}>No members found</div>
          ) : (
            <div className={styles.tableOuter}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Member Code</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Tier</th>
                      <th>CRM</th>
                      <th>Default Discount</th>
                      <th>Created At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td>{member.id}</td>
                        <td>{member.member_code || "—"}</td>
                        <td>{member.name || "—"}</td>
                        <td>{member.phone || "—"}</td>
                        <td>{member.email || "—"}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              styles[`status_${member.member_status || "active"}`]
                            }`}
                          >
                            {member.member_status || "active"}
                          </span>
                        </td>
                        <td>
                          <span className={styles.badge}>
                            {member.tier || "—"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.crmCell}>
                            <strong>
                              {member.birthday
                                ? moment(member.birthday).format("MMM D")
                                : "No birthday"}
                            </strong>
                            <span>
                              {member.preferences
                                ? member.preferences
                                : "No preferences"}
                            </span>
                            <small>
                              Wallet offers:{" "}
                              {Number(member.mobile_wallet_notifications ?? 1) === 1
                                ? "On"
                                : "Off"}
                            </small>
                          </div>
                        </td>
                        <td>{Number(member.membership_discount_pct || 0)}%</td>
                        <td>{formatDateTime(member.created_at)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => startEditingMember(member)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => openHistoryModal(member.id)}
                            >
                              History
                            </button>
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={() => handleDeleteMember(member)}
                              disabled={deletingMemberId === member.id}
                            >
                              {deletingMemberId === member.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {showHistoryModal ? (
        <div className={styles.modalOverlay} onClick={closeHistoryModal}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Member History</h3>
                <p>
                  Detailed sales and profile information for the selected member
                </p>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={closeHistoryModal}
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <div className={styles.loader}>Loading member history...</div>
            ) : selectedMember ? (
              <>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailCard}>
                    <span>Member Code</span>
                    <strong>{selectedMember.member_code || "—"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Name</span>
                    <strong>{selectedMember.name || "—"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Tier</span>
                    <strong>{selectedMember.tier || "—"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Tier Discount</span>
                    <strong>{Number(selectedMember.membership_discount_pct || 0)}%</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Phone</span>
                    <strong>{selectedMember.phone || "—"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Email</span>
                    <strong>{selectedMember.email || "—"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Birthday</span>
                    <strong>
                      {selectedMember.birthday
                        ? moment(selectedMember.birthday).format("DD MMM YYYY")
                        : "—"}
                    </strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Mobile Wallet Offers</span>
                    <strong>
                      {Number(selectedMember.mobile_wallet_notifications ?? 1) === 1
                        ? "Enabled"
                        : "Disabled"}
                    </strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Status</span>
                    <strong>{selectedMember.member_status || "active"}</strong>
                  </div>

                  <div className={styles.detailCard}>
                    <span>Created At</span>
                    <strong>{formatDateTime(selectedMember.created_at)}</strong>
                  </div>
                </div>

                <div className={styles.crmDetailGrid}>
                  <div className={styles.crmDetailCard}>
                    <span>Preferences</span>
                    <strong>{selectedMember.preferences || "—"}</strong>
                  </div>
                  <div className={styles.crmDetailCard}>
                    <span>Offer Notes</span>
                    <strong>{selectedMember.offer_notes || "—"}</strong>
                  </div>
                </div>

                {selectedMember.wallet_token ? (
                  <div className={styles.walletCodeSection}>
                    <MemberWalletCode walletToken={selectedMember.wallet_token} />
                  </div>
                ) : null}

                <div className={styles.itemsSection}>
                  <div className={styles.itemsHeader}>
                    <div>
                      <h4>Sales History</h4>
                      <span>{memberSales.length} record(s)</span>
                    </div>

                    <div className={styles.headerActions}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={downloadMemberHistoryExcel}
                      >
                        Export Excel
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={downloadMemberHistoryDoc}
                      >
                        Export Word
                      </button>
                    </div>
                  </div>

                  {memberSales.length === 0 ? (
                    <div className={styles.emptyStateSmall}>
                      No sales found for this member
                    </div>
                  ) : (
                    <div className={styles.tableOuter}>
                      <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Sale ID</th>
                              <th>Customer</th>
                              <th>Total</th>
                              <th>Status</th>
                              <th>Payment Method</th>
                              <th>Sale Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberSales.map((sale) => (
                              <tr key={sale.id}>
                                <td>{sale.id}</td>
                                <td>{sale.customer || sale.customer_name || "—"}</td>
                                <td>
                                  {formatMoney(
                                    sale.total_amount || sale.total || 0
                                  )}
                                </td>
                                <td>{sale.status || "—"}</td>
                                <td>{sale.payment_method || "—"}</td>
                                <td>
                                  {formatDateTime(
                                    sale.sale_date || sale.created_at
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.emptyStateSmall}>
                No member information found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
