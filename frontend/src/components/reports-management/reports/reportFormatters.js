export function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function getReportErrorMessage(err) {
  return err?.response?.data?.message || "Failed to load report";
}
