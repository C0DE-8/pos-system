import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiAward, FiCreditCard, FiRefreshCw } from "react-icons/fi";
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
        <div className={styles.panelHeader}>
          <div className={styles.icon}>
            <FiCreditCard />
          </div>
          <div>
            <h1>Wallet Balance</h1>
            <p>Scan-to-check member credit</p>
          </div>
        </div>

        {loading ? (
          <p className={styles.muted}>Checking balance...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <div className={styles.atmCardWrap}>
            <div className={styles.atmCard}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardEyebrow}>Arena Pro Wallet</span>
                  <strong className={styles.cardName}>{wallet?.name || "Member"}</strong>
                </div>
                <div className={styles.cardMark}>AP</div>
              </div>

              <div className={styles.cardChipRow}>
                <div className={styles.cardChip} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.contactless} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className={styles.balanceBlock}>
                <span>Available Credit</span>
                <strong>{formatMoney(wallet?.wallet_balance)}</strong>
              </div>

              <div className={styles.cardFooter}>
                <div>
                  <span>Member Code</span>
                  <strong>{wallet?.member_code || "-"}</strong>
                </div>
                <div>
                  <span>Tier</span>
                  <strong>{wallet?.membership_tier_name || "-"}</strong>
                </div>
                <div>
                  <span>Points</span>
                  <strong>{Number(wallet?.points || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Badge</span>
                  <strong>{wallet?.reward_badge || "Starter"}</strong>
                </div>
              </div>
            </div>

            <div className={styles.tokenStrip}>
              <span>Wallet Token</span>
              <strong>{wallet?.wallet_token}</strong>
            </div>

            {Array.isArray(wallet?.missions) && wallet.missions.length ? (
              <div className={styles.missionPanel}>
                <div className={styles.missionHead}>
                  <FiAward />
                  <div>
                    <h2>Active Missions</h2>
                    <p>Complete challenges to earn bonus rewards.</p>
                  </div>
                </div>
                <div className={styles.missionList}>
                  {wallet.missions.map((mission) => (
                    <div key={mission.id} className={styles.missionCard}>
                      <div className={styles.missionTop}>
                        <strong>{mission.title}</strong>
                        {mission.is_completed ? <span>Done</span> : null}
                      </div>
                      {mission.description ? <p>{mission.description}</p> : null}
                      <div className={styles.missionTrack}>
                        <span style={{ width: `${Number(mission.progress_percent || 0)}%` }} />
                      </div>
                      <small>
                        {Number(mission.progress_value || 0).toLocaleString("en-NG")} /{" "}
                        {Number(mission.target_value || 0).toLocaleString("en-NG")}
                        {Number(mission.bonus_points || 0) > 0
                          ? ` • +${Number(mission.bonus_points || 0).toLocaleString("en-NG")} pts`
                          : ""}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <button type="button" onClick={loadBalance} className={styles.refreshBtn}>
          <FiRefreshCw />
          Refresh Balance
        </button>
      </section>
    </main>
  );
}
