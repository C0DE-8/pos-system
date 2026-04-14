// src/hooks/useDashboard.js
import { useCallback, useEffect, useState } from "react";
import { getDashboardData } from "../api/dashboardApi";

export default function useDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const response = await getDashboardData();

      if (response.success) {
        setDashboardData(response);
      } else {
        setError(response.message || "Failed to load dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return {
    dashboardData,
    loading,
    refreshing,
    error,
    refetch: fetchDashboard
  };
}