import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCw,
  FiShoppingBag,
  FiTarget,
  FiTrendingUp,
  FiUsers
} from "react-icons/fi";
import { getAdvancedAnalyticsDashboard } from "../../api/reportsApi";
import styles from "./AdvancedAnalyticsDashboard.module.css";

const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" }
];

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultDateRange(range) {
  const now = new Date();
  const end = formatDateInput(now);
  if (range === "today") return { start: end, end };
  if (range === "7d") return { start: formatDateInput(addDays(now, -6)), end };
  return { start: formatDateInput(addDays(now, -29)), end };
}

function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function maxValue(rows, keys) {
  return Math.max(
    1,
    ...rows.map((row) => keys.reduce((sum, key) => sum + Number(row[key] || 0), 0))
  );
}

export default function AdvancedAnalyticsDashboard() {
  const defaultRange = getDefaultDateRange("30d");
  const [range, setRange] = useState("30d");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    if (range === "custom") return { start: startDate, end: endDate };
    return { range, start: startDate, end: endDate };
  }, [range, startDate, endDate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdvancedAnalyticsDashboard(params);
      setDashboard(res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load advanced analytics");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [params]);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    if (nextRange !== "custom") {
      const defaults = getDefaultDateRange(nextRange);
      setStartDate(defaults.start);
      setEndDate(defaults.end);
    }
  };

  const kpis = dashboard?.kpis || {};
  const categorySales = dashboard?.sales?.category_sales || [];
  const topItems = dashboard?.sales?.top_items || [];
  const walletTrend = dashboard?.wallet?.trend || [];
  const walletSources = dashboard?.wallet?.sources || [];
  const tierActivity = dashboard?.membership?.tier_activity || [];
  const memberLeaderboard = dashboard?.membership?.leaderboard || [];
  const pointsTrend = dashboard?.points?.trend || [];
  const promotionSignals = dashboard?.sales?.promotion_signals || [];

  const insights = useMemo(() => {
    const topCategory = categorySales[0];
    const topTier = tierActivity[0];
    const walletShare = Number(kpis.wallet_sales_share || 0);
    const averageTopup = Number(kpis.average_topup || 0);
    const notes = [];

    if (topCategory) {
      notes.push({
        title: "Category focus",
        text: `${topCategory.category_name} leads sales with ${formatMoney(topCategory.revenue)} revenue.`
      });
    }

    notes.push({
      title: "Wallet adoption",
      text:
        walletShare >= 0.25
          ? `Wallet is strong at ${formatPercent(walletShare)} of sales.`
          : `Wallet is ${formatPercent(walletShare)} of sales, leaving room for top-up promotions.`
    });

    if (topTier) {
      notes.push({
        title: "Membership pull",
        text: `${topTier.tier_name} members generated ${formatMoney(topTier.sales_total)} in tracked sales.`
      });
    }

    if (averageTopup > 0) {
      notes.push({
        title: "Top-up pattern",
        text: `Average wallet top-up is ${formatMoney(averageTopup)} in this range.`
      });
    }

    return notes;
  }, [categorySales, kpis.wallet_sales_share, kpis.average_topup, tierActivity]);

  const categoryMax = maxValue(categorySales, ["revenue"]);
  const walletMax = maxValue(walletTrend, ["credits", "debits"]);
  const pointsMax = maxValue(pointsTrend, ["earned", "redeemed", "adjusted"]);

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Admin Intelligence</span>
          <h1>Advanced Analytics</h1>
          <p>Wallet usage, sales mix, top-up behavior, and membership performance.</p>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.rangeTabs}>
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={range === option.value ? styles.rangeActive : ""}
                onClick={() => handleRangeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={loadDashboard}
            aria-label="Refresh advanced analytics"
            title="Refresh advanced analytics"
            disabled={loading}
          >
            <FiRefreshCw />
          </button>
        </div>
      </section>

      <section className={styles.filterBand}>
        <label>
          <span>Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setRange("custom");
              setStartDate(event.target.value);
            }}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setRange("custom");
              setEndDate(event.target.value);
            }}
          />
        </label>
        <div className={styles.rangeLabel}>
          <span>Viewing</span>
          <strong>{startDate} to {endDate}</strong>
        </div>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <FiDollarSign />
          <span>Total Sales</span>
          <strong>{loading ? "..." : formatMoney(kpis.total_sales)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <FiCreditCard />
          <span>Wallet Sales</span>
          <strong>{loading ? "..." : formatMoney(kpis.wallet_payment)}</strong>
          <small>{formatPercent(kpis.wallet_sales_share)} of sales</small>
        </div>
        <div className={styles.kpiCard}>
          <FiUsers />
          <span>Active Members</span>
          <strong>{loading ? "..." : formatNumber(kpis.active_members)}</strong>
          <small>{formatNumber(kpis.new_members)} new</small>
        </div>
        <div className={styles.kpiCard}>
          <FiAward />
          <span>Points Earned</span>
          <strong>{loading ? "..." : formatNumber(kpis.earned_points || kpis.points_earned)}</strong>
          <small>{formatNumber(kpis.redeemed_points || kpis.reward_points_redeemed)} redeemed</small>
        </div>
        <div className={styles.kpiCard}>
          <FiTrendingUp />
          <span>Average Order</span>
          <strong>{loading ? "..." : formatMoney(kpis.average_order_value)}</strong>
          <small>{formatNumber(kpis.order_count)} orders</small>
        </div>
        <div className={styles.kpiCard}>
          <FiTarget />
          <span>Total Discounts</span>
          <strong>{loading ? "..." : formatMoney(kpis.total_discounts)}</strong>
          <small>Membership, loyalty, gift cards</small>
        </div>
      </section>

      <section className={styles.insightGrid}>
        {insights.map((insight) => (
          <article key={insight.title} className={styles.insightCard}>
            <span>{insight.title}</span>
            <p>{insight.text}</p>
          </article>
        ))}
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Category Sales</h2>
              <p>Revenue and quantity by product category.</p>
            </div>
            <FiBarChart2 />
          </div>

          <div className={styles.barList}>
            {categorySales.length ? (
              categorySales.map((category) => {
                const width = Math.max(4, (Number(category.revenue || 0) / categoryMax) * 100);
                return (
                  <div key={`${category.category_name}-${category.category_type}`} className={styles.barRow}>
                    <div className={styles.barRowTop}>
                      <strong>{category.category_name}</strong>
                      <span>{formatMoney(category.revenue)}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <span style={{ width: `${width}%` }} />
                    </div>
                    <small>{formatNumber(category.qty)} sold • {formatNumber(category.order_count)} orders</small>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>No category sales in this range</div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Wallet Flow</h2>
              <p>Credits, debits, and payment movement.</p>
            </div>
            <FiCreditCard />
          </div>

          <div className={styles.walletSummary}>
            <div>
              <span>Top-ups</span>
              <strong>{formatMoney(kpis.wallet_credited)}</strong>
            </div>
            <div>
              <span>Debits</span>
              <strong>{formatMoney(kpis.wallet_debited)}</strong>
            </div>
            <div>
              <span>Liability</span>
              <strong>{formatMoney(kpis.wallet_liability)}</strong>
            </div>
          </div>

          <div className={styles.trendBars}>
            {walletTrend.length ? (
              walletTrend.map((row) => {
                const credits = (Number(row.credits || 0) / walletMax) * 100;
                const debits = (Number(row.debits || 0) / walletMax) * 100;
                return (
                  <div key={row.bucket} className={styles.trendRow}>
                    <span>{row.bucket}</span>
                    <div className={styles.stackedTrack}>
                      <b className={styles.creditBar} style={{ width: `${credits}%` }} />
                      <b className={styles.debitBar} style={{ width: `${debits}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>No wallet movement in this range</div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Membership Activity</h2>
              <p>Tier sales, discounts, wallet balances, and point balances.</p>
            </div>
            <FiUsers />
          </div>

          <div className={styles.tableOuter}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Members</th>
                  <th>Orders</th>
                  <th>Sales</th>
                  <th>Discounts</th>
                  <th>Wallet</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {tierActivity.length ? (
                  tierActivity.map((tier) => (
                    <tr key={tier.tier_name}>
                      <td><strong>{tier.tier_name}</strong></td>
                      <td>{formatNumber(tier.member_count)}</td>
                      <td>{formatNumber(tier.order_count)}</td>
                      <td>{formatMoney(tier.sales_total)}</td>
                      <td>{formatMoney(tier.discount_total)}</td>
                      <td>{formatMoney(tier.wallet_balance)}</td>
                      <td>{formatNumber(tier.points_balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className={styles.emptyCell}>No membership activity found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Top Members</h2>
              <p>Highest value members in the selected range.</p>
            </div>
            <FiActivity />
          </div>

          <div className={styles.leaderList}>
            {memberLeaderboard.length ? (
              memberLeaderboard.map((member, index) => (
                <div key={member.id} className={styles.leaderItem}>
                  <span className={styles.rank}>{index + 1}</span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.member_code} • {member.tier_name}</small>
                  </div>
                  <b>{formatMoney(member.sales_total)}</b>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No member sales in this range</div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.secondaryGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Top Items</h2>
              <p>Popular games, food, drinks, and services.</p>
            </div>
            <FiShoppingBag />
          </div>

          <div className={styles.compactList}>
            {topItems.length ? (
              topItems.map((item) => (
                <div key={`${item.item_name}-${item.category_name}`}>
                  <span>
                    <strong>{item.item_name}</strong>
                    <small>{item.category_name} • {formatNumber(item.qty)} sold</small>
                  </span>
                  <b>{formatMoney(item.revenue)}</b>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No item sales in this range</div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Top-up Sources</h2>
              <p>Where wallet credits and debits are coming from.</p>
            </div>
            <FiCreditCard />
          </div>

          <div className={styles.compactList}>
            {walletSources.length ? (
              walletSources.map((source) => (
                <div key={`${source.source}-${source.transaction_type}`}>
                  <span>
                    <strong>{source.source || "manual"}</strong>
                    <small>{source.transaction_type} • {formatNumber(source.count)} transactions</small>
                  </span>
                  <b>{formatMoney(source.amount)}</b>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No wallet sources in this range</div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Points Movement</h2>
              <p>Earned, redeemed, and adjusted reward points.</p>
            </div>
            <FiAward />
          </div>

          <div className={styles.trendBars}>
            {pointsTrend.length ? (
              pointsTrend.map((row) => {
                const earned = (Number(row.earned || 0) / pointsMax) * 100;
                const redeemed = (Number(row.redeemed || 0) / pointsMax) * 100;
                const adjusted = (Number(row.adjusted || 0) / pointsMax) * 100;
                return (
                  <div key={row.bucket} className={styles.trendRow}>
                    <span>{row.bucket}</span>
                    <div className={styles.stackedTrack}>
                      <b className={styles.earnedBar} style={{ width: `${earned}%` }} />
                      <b className={styles.redeemedBar} style={{ width: `${redeemed}%` }} />
                      <b className={styles.adjustedBar} style={{ width: `${adjusted}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>No points movement in this range</div>
            )}
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Discount Signal</h2>
            <p>Membership discount pressure compared with sales by tier.</p>
          </div>
          <FiTarget />
        </div>

        <div className={styles.tableOuter}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Membership</th>
                <th>Orders</th>
                <th>Subtotal</th>
                <th>Membership Discount</th>
                <th>Loyalty Discount</th>
                <th>Net Sales</th>
                <th>Discount Rate</th>
              </tr>
            </thead>
            <tbody>
              {promotionSignals.length ? (
                promotionSignals.map((signal) => {
                  const subtotal = Number(signal.subtotal || 0);
                  const discountRate = subtotal > 0
                    ? Number(signal.membership_discount || 0) / subtotal
                    : 0;
                  return (
                    <tr key={signal.tier_name}>
                      <td><strong>{signal.tier_name}</strong></td>
                      <td>{formatNumber(signal.order_count)}</td>
                      <td>{formatMoney(signal.subtotal)}</td>
                      <td>{formatMoney(signal.membership_discount)}</td>
                      <td>{formatMoney(signal.loyalty_discount)}</td>
                      <td>{formatMoney(signal.total)}</td>
                      <td>{formatPercent(discountRate)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyCell}>No discount signal in this range</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
