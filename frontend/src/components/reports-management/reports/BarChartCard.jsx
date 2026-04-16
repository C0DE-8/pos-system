export default function BarChartCard({ styles, title, subtitle, data, valueKey, labelKey, formatter }) {
  const max = Math.max(...data.map((item) => Number(item?.[valueKey] || 0)), 0);

  return (
    <section className={styles.tableCard}>
      <h3>{title}</h3>
      {subtitle ? <p className={styles.chartSubtitle}>{subtitle}</p> : null}
      {!data.length ? (
        <p className={styles.emptyText}>No data available for this period.</p>
      ) : (
        <div className={styles.chartList}>
          {data.map((item, idx) => {
            const value = Number(item?.[valueKey] || 0);
            const widthPercent = max > 0 ? Math.max((value / max) * 100, 4) : 4;
            return (
              <div key={`${item?.[labelKey] || "label"}-${idx}`} className={styles.chartRow}>
                <div className={styles.chartRowHead}>
                  <span className={styles.chartLabel}>{item?.[labelKey] || "N/A"}</span>
                  <span className={styles.chartValue}>{formatter(value)}</span>
                </div>
                <div className={styles.chartTrack}>
                  <div className={styles.chartBar} style={{ width: `${widthPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
