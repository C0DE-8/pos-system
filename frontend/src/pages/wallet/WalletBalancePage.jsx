import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCreditCard, FiRefreshCw } from "react-icons/fi";
import { getWalletBalanceByToken } from "../../api/membersApi";
import styles from "./WalletBalancePage.module.css";

export default function WalletBalancePage() {
  const { token } = useParams();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBalance = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getWalletBalanceByToken(token);
      setWallet(res?.data || null);
    } catch (err) {
      setWallet(null);
      setError(err?.response?.data?.message || "Wallet balance unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [token]);

  const formatMoney = (value) => {
    return `₦${Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.icon}>
          <FiCreditCard />
        </div>

        <h1>Wallet Balance</h1>

        {loading ? (
          <p className={styles.muted}>Checking balance...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <>
            <div className={styles.memberBlock}>
              <h2>{wallet?.name || "Member"}</h2>
              <div className={styles.infoGrid}>
                <div>
                  <span>Member Code</span>
                  <strong>{wallet?.member_code || "-"}</strong>
                </div>
                <div>
                  <span>Tier</span>
                  <strong>{wallet?.membership_tier_name || "-"}</strong>
                </div>
              </div>
            </div>

            <p className={styles.balance}>{formatMoney(wallet?.wallet_balance)}</p>
            <p className={styles.token}>Token: {wallet?.wallet_token}</p>
          </>
        )}

        <button type="button" onClick={loadBalance} className={styles.refreshBtn}>
          <FiRefreshCw />
          Refresh Balance
        </button>
      </section>
    </main>
  );
}
