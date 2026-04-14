// src/components/admin/AdminRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../../api/authApi";
import DashboardLoader from "../dashboard-loader/DashboardLoader";

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!token) {
          setIsAllowed(false);
          setLoading(false);
          return;
        }

        const res = await getMe();
        const user = res?.user || null;

        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("permissions", JSON.stringify(res?.permissions || {}));

        setIsAllowed(user?.role === "admin");
      } catch (error) {
        setIsAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [token]);

  if (loading) {
    return <DashboardLoader />;
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}