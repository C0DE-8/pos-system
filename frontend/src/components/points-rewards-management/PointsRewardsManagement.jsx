import { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiMinusCircle,
  FiPlusCircle,
  FiRefreshCw,
  FiSearch,
  FiSliders
} from "react-icons/fi";
import {
  createPointsLedgerEntry,
  getMembers,
  getPointsLedger
} from "../../api/membersApi";
import styles from "./PointsRewardsManagement.module.css";

const initialForm = {
  member_id: "",
  transaction_type: "earn",
  points: "",
  reference: "",
  note: ""
};

const POINT_VALUE = 10;

const getBadgeClass = (badge) => {
  const value = String(badge || "").toLowerCase();
  if (value.includes("legend")) return styles.badgeLegend;
  if (value.includes("champion")) return styles.badgeChampion;
  if (value.includes("pro")) return styles.badgePro;
  if (value.includes("rising")) return styles.badgeRising;
  return styles.badgeStarter;
};

export default function PointsRewardsManagement() {
  const [members, setMembers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMember = useMemo(() => {
    return members.find((member) => Number(member.id) === Number(form.member_id)) || null;
  }, [form.member_id, members]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = members.filter((member) => {
      if (!term) return true;

      return (
        String(member.name || "").toLowerCase().includes(term) ||
        String(member.member_code || "").toLowerCase().includes(term) ||
        String(member.phone || "").toLowerCase().includes(term) ||
        String(member.email || "").toLowerCase().includes(term)
      );
    });

    return list
      .sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
      .slice(0, 10);
  }, [members, search]);

  const visibleLedger = useMemo(() => {
    if (ledgerFilter === "selected" && selectedMember) {
      return ledger.filter((entry) => Number(entry.member_id) === Number(selectedMember.id));
    }

    return ledger;
  }, [ledger, ledgerFilter, selectedMember]);

  const stats = useMemo(() => {
    const totalPoints = members.reduce((sum, member) => sum + Number(member.points || 0), 0);
    const lifetimePoints = members.reduce(
      (sum, member) => sum + Number(member.lifetime_points || 0),
      0
    );
    const redeemableValue = totalPoints * POINT_VALUE;
    const activeRewardMembers = members.filter((member) => Number(member.points || 0) > 0)
      .length;

    return {
      totalPoints,
      lifetimePoints,
      redeemableValue,
      activeRewardMembers
    };
  }, [members]);

  const loadRewardsData = async () => {
    try {
      setLoading(true);
      setError("");

      const [membersRes, ledgerRes] = await Promise.all([getMembers(), getPointsLedger()]);
      setMembers(membersRes?.data || []);
      setLedger(ledgerRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reward points");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-NG");
  };

  const formatMoney = (value) => {
    return `₦${Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-NG");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const selectMember = (member) => {
    setForm((current) => ({ ...current, member_id: String(member.id) }));
    setSearch(member.name || member.member_code || "");
    setLedgerFilter("selected");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.member_id) {
      setError("Select a member before recording points");
      return;
    }

    const points = Math.floor(Number(form.points || 0));
    if (points <= 0) {
      setError("Enter points greater than zero");
      return;
    }

    if (form.transaction_type === "redeem" && selectedMember) {
      const availablePoints = Math.floor(Number(selectedMember.points || 0));
      if (points > availablePoints) {
        setError("This member does not have enough points to redeem");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await createPointsLedgerEntry({
        member_id: Number(form.member_id),
        transaction_type: form.transaction_type,
        points,
        reference: form.reference.trim() || null,
        note: form.note.trim() || null
      });

      setSuccess(res?.message || "Reward points updated");
      setForm((current) => ({
        ...initialForm,
        member_id: current.member_id,
        transaction_type: current.transaction_type
      }));
      await loadRewardsData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update reward points");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Member Rewards</span>
          <h1>Points & Rewards</h1>
          <p>Review member points, badges, lifetime rewards, and manual audit entries.</p>
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={loadRewardsData}
          aria-label="Refresh reward data"
          title="Refresh reward data"
        >
          <FiRefreshCw />
        </button>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Current Points</span>
          <strong>{formatNumber(stats.totalPoints)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Lifetime Points</span>
          <strong>{formatNumber(stats.lifetimePoints)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Redeemable Value</span>
          <strong>{formatMoney(stats.redeemableValue)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Reward Members</span>
          <strong>{formatNumber(stats.activeRewardMembers)}</strong>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Member Points</h2>
              <p>Search a member to inspect and manage their reward balance.</p>
            </div>
          </div>

          <label className={styles.searchBox}>
            <FiSearch />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code, phone, or email"
            />
          </label>

          <div className={styles.memberList}>
            {loading ? (
              <div className={styles.emptyState}>Loading rewards...</div>
            ) : filteredMembers.length ? (
              filteredMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className={`${styles.memberItem} ${
                    Number(form.member_id) === Number(member.id) ? styles.memberItemActive : ""
                  }`}
                  onClick={() => selectMember(member)}
                >
                  <span>
                    <strong>{member.name || "Unnamed member"}</strong>
                    <small>{member.member_code || "-"} • {member.phone || "-"}</small>
                  </span>
                  <b>{formatNumber(member.points)} pts</b>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>No members found</div>
            )}
          </div>

          {selectedMember ? (
            <div className={styles.rewardCard}>
              <div className={styles.rewardCardTop}>
                <span>Selected Member</span>
                <strong>{selectedMember.name || "Unnamed member"}</strong>
                <small>{selectedMember.email || selectedMember.phone || "-"}</small>
              </div>
              <div className={styles.rewardMetrics}>
                <div>
                  <span>Available</span>
                  <strong>{formatNumber(selectedMember.points)} pts</strong>
                </div>
                <div>
                  <span>Lifetime</span>
                  <strong>{formatNumber(selectedMember.lifetime_points)} pts</strong>
                </div>
                <div>
                  <span>Value</span>
                  <strong>{formatMoney(Number(selectedMember.points || 0) * POINT_VALUE)}</strong>
                </div>
              </div>
              <span className={`${styles.badgePill} ${getBadgeClass(selectedMember.reward_badge)}`}>
                <FiAward />
                {selectedMember.reward_badge || "Starter"}
              </span>
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Manual Entry</h2>
              <p>Record earn, redeem, or adjustment events with a staff audit trail.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.segmented}>
              <button
                type="button"
                className={form.transaction_type === "earn" ? styles.segmentActive : ""}
                onClick={() => setForm((current) => ({ ...current, transaction_type: "earn" }))}
              >
                <FiPlusCircle />
                Earn
              </button>
              <button
                type="button"
                className={form.transaction_type === "redeem" ? styles.segmentActive : ""}
                onClick={() =>
                  setForm((current) => ({ ...current, transaction_type: "redeem" }))
                }
              >
                <FiMinusCircle />
                Redeem
              </button>
              <button
                type="button"
                className={form.transaction_type === "adjust" ? styles.segmentActive : ""}
                onClick={() =>
                  setForm((current) => ({ ...current, transaction_type: "adjust" }))
                }
              >
                <FiSliders />
                Adjust
              </button>
            </div>

            <label className={styles.formGroup}>
              <span>Points</span>
              <input
                type="number"
                min="1"
                step="1"
                name="points"
                value={form.points}
                onChange={handleChange}
                placeholder="0"
              />
            </label>

            <label className={styles.formGroup}>
              <span>Reference</span>
              <input
                type="text"
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="Receipt, promo, correction"
              />
            </label>

            <label className={styles.formGroup}>
              <span>Note</span>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows="4"
                placeholder="Optional reason for this points entry"
              />
            </label>

            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              <FiAward />
              {saving ? "Saving..." : "Save Points Entry"}
            </button>
          </form>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Points Ledger</h2>
            <p>Latest reward activity across members.</p>
          </div>

          <div className={styles.filterGroup}>
            <button
              type="button"
              className={ledgerFilter === "all" ? styles.filterActive : ""}
              onClick={() => setLedgerFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={ledgerFilter === "selected" ? styles.filterActive : ""}
              onClick={() => setLedgerFilter("selected")}
              disabled={!selectedMember}
            >
              Selected
            </button>
          </div>
        </div>

        <div className={styles.tableOuter}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Points</th>
                <th>Before</th>
                <th>After</th>
                <th>Source</th>
                <th>Reference</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {visibleLedger.length ? (
                visibleLedger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>
                      <strong>{entry.member_name || "-"}</strong>
                      <small>{entry.member_code || "-"}</small>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${styles[entry.transaction_type] || ""}`}>
                        {entry.transaction_type}
                      </span>
                    </td>
                    <td>{formatNumber(entry.points)}</td>
                    <td>{formatNumber(entry.points_before)}</td>
                    <td>{formatNumber(entry.points_after)}</td>
                    <td>{entry.source || "-"}</td>
                    <td>{entry.reference || "-"}</td>
                    <td>{entry.created_by_name || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className={styles.emptyCell}>
                    No points activity found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
