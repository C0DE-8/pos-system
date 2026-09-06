import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiClock, FiLock, FiMapPin, FiRefreshCw, FiUser } from "react-icons/fi";
import { getBranchSlugs, loginUser } from "../../../api/authApi";
import styles from "./Login.module.css";

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("branch_slug");
};

const isTokenValid = (token) => {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function Login() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({ identifier: "", password: "", branch_slug: localStorage.getItem("branch_slug") || "" });
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user && isTokenValid(token)) {
      navigate("/dashboard", { replace: true });
      return;
    }
    clearAuthStorage();
    setCheckingAuth(false);
  }, [navigate]);

  const fetchBranches = useCallback(async (signal) => {
    setBranchesLoading(true);
    setBranchError("");
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await getBranchSlugs({ signal, timeout: 8000 });
        const list = Array.isArray(response?.data) ? response.data : [];
        if (!list.length) throw new Error("No active locations are available.");
        setBranches(list);
        setForm((previous) => ({
          ...previous,
          branch_slug: list.some((branch) => branch.slug === previous.branch_slug) ? previous.branch_slug : list[0].slug
        }));
        setBranchesLoading(false);
        return;
      } catch (requestError) {
        if (requestError?.code === "ERR_CANCELED") return;
        lastError = requestError;
        if (attempt < 2) await delay(400 * (attempt + 1));
      }
    }
    setBranches([]);
    setBranchError(lastError?.response?.data?.message || lastError?.message || "Could not load locations.");
    setBranchesLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchBranches(controller.signal);
    return () => controller.abort();
  }, [fetchBranches]);

  const handleChange = ({ target: { name, value } }) => setForm((previous) => ({ ...previous, [name]: value }));

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { identifier: form.identifier.trim(), password: form.password, branch_slug: form.branch_slug.trim() };
      const data = await loginUser(payload);
      if (!data?.token || !isTokenValid(data.token)) throw new Error("Invalid session returned from server.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("branch_slug", payload.branch_slug);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      clearAuthStorage();
      setError(requestError?.response?.data?.message || requestError?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className={styles.loadingPage}><div className={styles.loader} /><span>Preparing your POS workspace…</span></div>;

  return (
    <main className={styles.loginPage}>
      <section className={styles.brandPanel}>
        <div className={styles.brandMark}><span>AP</span></div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Arena Pro · Point of Sale</span>
          <h1>Run every game.<br /><em>Own every moment.</em></h1>
          <p>One fast, reliable workspace for sales, sessions, inventory, staff, and daily operations.</p>
        </div>
        <div className={styles.statusBar}><span className={styles.statusDot} /><div><strong>POS ready</strong><small>Secure access for authorized staff</small></div></div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.loginCard}>
          <div className={styles.mobileBrand}><span>AP</span><strong>Arena Pro</strong></div>
          <header className={styles.formHeader}><span>STAFF PORTAL</span><h2>Welcome back</h2><p>Sign in to open your Arena Pro POS workspace.</p></header>
          <form onSubmit={handleLogin} className={styles.form}>
            <label className={styles.formGroup} htmlFor="identifier"><span>Username or email</span><div className={styles.inputWrap}><FiUser /><input id="identifier" name="identifier" value={form.identifier} onChange={handleChange} placeholder="Enter your account" autoComplete="username" required autoFocus /></div></label>
            <label className={styles.formGroup} htmlFor="password"><span>Password</span><div className={styles.inputWrap}><FiLock /><input id="password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" required /></div></label>
            <label className={styles.formGroup} htmlFor="branch_slug"><span>POS location</span><div className={`${styles.inputWrap} ${branchError ? styles.inputError : ""}`}><FiMapPin /><select id="branch_slug" name="branch_slug" value={form.branch_slug} onChange={handleChange} disabled={branchesLoading || Boolean(branchError)} required><option value="">{branchesLoading ? "Loading locations…" : branchError ? "Locations unavailable" : "Select a location"}</option>{branches.map((branch) => <option key={`${branch.business_id}-${branch.slug}`} value={branch.slug}>{branch.business_name} · {branch.name}</option>)}</select></div></label>
            {branchError && <div className={styles.branchError}><span>{branchError}</span><button type="button" onClick={() => fetchBranches()}><FiRefreshCw /> Retry</button></div>}
            {error && <div className={styles.errorText} role="alert">{error}</div>}
            <button type="submit" disabled={loading || branchesLoading || Boolean(branchError) || !form.branch_slug} className={styles.loginBtn}><span>{loading ? "Signing in…" : "Open POS workspace"}</span>{!loading && <FiArrowRight />}</button>
            <Link to="/clock" className={styles.clockLink}><FiClock />Clock in or out</Link>
          </form>
          <footer>Protected staff access <span>•</span> Arena Pro POS</footer>
        </div>
      </section>
    </main>
  );
}
