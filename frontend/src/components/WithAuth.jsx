import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../api/authApi";
import { hasPermission, normalizePermissions } from "../utils/permissions";
import DashboardLoader from "./dashboard-loader/DashboardLoader";

export default function WithAuth({ children, permissionKey = null }) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!token) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const res = await getMe();

        const user = res?.user || null;
        const permissions = normalizePermissions(user, res?.permissions);

        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("permissions", JSON.stringify(permissions));

        if (!permissionKey) {
          setAllowed(true);
        } else {
          setAllowed(hasPermission(user, permissions, permissionKey));
        }
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("permissions");
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [token, permissionKey]);

  if (loading) {
    return <DashboardLoader />;
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}