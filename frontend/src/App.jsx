import { BrowserRouter, Routes, Route } from "react-router-dom";

import WithAuth from "./components/WithAuth";
import Login from "./pages/auth/login/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import NotFound from "./pages/404/NotFound";
import ClockPage from "./pages/auth/clock/ClockPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/clock" element={<ClockPage />} />

        <Route
          path="/dashboard"
          element={
            <WithAuth allowedRoles={["admin", "manager", "cashier", "viewer"]}>
              <Dashboard />
            </WithAuth>
          }
        />

        {/* 404 page */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}