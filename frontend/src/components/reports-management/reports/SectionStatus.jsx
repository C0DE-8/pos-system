export default function SectionStatus({ styles, loading, error, empty }) {
  if (loading) {
    return <p className={styles.emptyText}>Loading report...</p>;
  }

  if (error) {
    return <p className={styles.sectionError}>{error}</p>;
  }

  if (empty) {
    return <p className={styles.emptyText}>No data available for this period.</p>;
  }

  return null;
}
