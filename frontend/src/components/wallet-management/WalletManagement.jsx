import { useEffect, useMemo, useState } from "react";
import { FiCreditCard, FiMinusCircle, FiPlusCircle, FiRefreshCw } from "react-icons/fi";
import {
  createWalletTransaction,
  getMembers,
  getWalletTransactions
} from "../../api/membersApi";
import styles from "./WalletManagement.module.css";

const initialForm = {
  member_id: "",
  transaction_type: "credit",
  amount: "",
  reference: "",
  note: ""
};

export default function WalletManagement() {
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMember = useMemo(() => {
    return members.find((member) => Number(member.id) === Number(form.member_id)) || null;
  }, [form.member_id, members]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members.slice(0, 8);

    return members
      .filter((member) => {
        return (
          String(member.name || "").toLowerCase().includes(term) ||
          String(member.member_code || "").toLowerCase().includes(term) ||
          String(member.phone || "").toLowerCase().includes(term) ||
          String(member.wallet_token || "").toLowerCase().includes(term)
        );
      })
      .slice(0, 8);
  }, [members, search]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError("");

      const [membersRes, transactionsRes] = await Promise.all([
        getMembers(),
        getWalletTransactions()
      ]);

      setMembers(membersRes?.data || []);
      setTransactions(transactionsRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

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
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.member_id) {
      setError("Select a member wallet first");
      return;
    }

    if (Number(form.amount || 0) <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await createWalletTransaction({
        member_id: Number(form.member_id),
        transaction_type: form.transaction_type,
        amount: Number(form.amount),
        reference: form.reference.trim() || null,
        note: form.note.trim() || null
      });

      setSuccess(res?.message || "Wallet updated");
      setForm((current) => ({
        ...initialForm,
        member_id: current.member_id,
        transaction_type: current.transaction_type
      }));
      await loadWalletData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update wallet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div>
          <h1>Wallet Top-Up</h1>
          <p>Manually credit or debit member wallet balances and review the audit trail.</p>
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={loadWalletData}
          aria-label="Refresh wallet data"
          title="Refresh wallet data"
        >
          <FiRefreshCw />
        </button>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Member Wallet</h2>
              <p>Select a member before recording a wallet transaction.</p>
            </div>
          </div>

          <div className={styles.searchBox}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code, phone, or wallet token"
            />
          </div>

          <div className={styles.memberList}>
            {loading ? (
              <div className={styles.emptyState}>Loading wallets...</div>
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
                    <small>{member.member_code || "-"} • {member.wallet_token || "-"}</small>
                  </span>
                  <b>{formatMoney(member.wallet_balance)}</b>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>No member wallets found</div>
            )}
          </div>

          {selectedMember ? (
            <div className={styles.walletSummary}>
              <div>
                <span>Wallet Balance</span>
                <strong>{formatMoney(selectedMember.wallet_balance)}</strong>
              </div>
              <div>
                <span>Wallet Token</span>
                <strong>{selectedMember.wallet_token || "-"}</strong>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Record Transaction</h2>
              <p>Credits add funds. Debits remove funds with an audit record.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.segmented}>
              <button
                type="button"
                className={form.transaction_type === "credit" ? styles.segmentActive : ""}
                onClick={() =>
                  setForm((current) => ({ ...current, transaction_type: "credit" }))
                }
              >
                <FiPlusCircle />
                Credit
              </button>
              <button
                type="button"
                className={form.transaction_type === "debit" ? styles.segmentActive : ""}
                onClick={() =>
                  setForm((current) => ({ ...current, transaction_type: "debit" }))
                }
              >
                <FiMinusCircle />
                Debit
              </button>
            </div>

            <label className={styles.formGroup}>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </label>

            <label className={styles.formGroup}>
              <span>Reference</span>
              <input
                type="text"
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="Receipt, bank transfer, approval code"
              />
            </label>

            <label className={styles.formGroup}>
              <span>Note</span>
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows="4"
                placeholder="Optional audit note"
              />
            </label>

            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              <FiCreditCard />
              {saving ? "Saving..." : "Save Wallet Transaction"}
            </button>
          </form>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Transaction Log</h2>
            <p>Latest wallet activity across members.</p>
          </div>
        </div>

        <div className={styles.tableOuter}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Before</th>
                <th>After</th>
                <th>Reference</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDateTime(transaction.created_at)}</td>
                    <td>
                      <strong>{transaction.member_name || "-"}</strong>
                      <small>{transaction.member_code || transaction.wallet_token}</small>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td>{formatMoney(transaction.amount)}</td>
                    <td>{formatMoney(transaction.balance_before)}</td>
                    <td>{formatMoney(transaction.balance_after)}</td>
                    <td>{transaction.reference || "-"}</td>
                    <td>{transaction.created_by_name || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyCell}>
                    No wallet transactions found
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
