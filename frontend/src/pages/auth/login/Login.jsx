import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../../api/authApi";
import styles from "./Login.module.css";
import { Link } from "react-router-dom";

const keypadNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const isTokenValid = (token) => {
  try {
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > currentTimeInSeconds;
  } catch (error) {
    return false;
  }
};

export default function Login() {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    name: "",
    pin: ""
  });

  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "pin") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 6);
      setForm((prev) => ({
        ...prev,
        pin: onlyNumbers
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeypadPress = (digit) => {
    setForm((prev) => {
      if (prev.pin.length >= 6) return prev;
      return {
        ...prev,
        pin: prev.pin + digit
      };
    });
  };

  const handleBackspace = () => {
    setForm((prev) => ({
      ...prev,
      pin: prev.pin.slice(0, -1)
    }));
  };

  const handleClearPin = () => {
    setForm((prev) => ({
      ...prev,
      pin: ""
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        pin: form.pin.trim()
      };

      const data = await loginUser(payload);

      if (!data?.token || !isTokenValid(data.token)) {
        clearAuthStorage();
        setError("Invalid or expired token returned from server");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      clearAuthStorage();
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.bgGlowOne}></div>
        <div className={styles.bgGlowTwo}></div>
        <div className={styles.bgGrid}></div>

        <div className={styles.loginCard}>
          <div className={styles.brand}>
            <div className={styles.logoCircle}>🎮</div>
            <h1>Arena Pro</h1>
            <p>Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.bgGlowOne}></div>
      <div className={styles.bgGlowTwo}></div>
      <div className={styles.bgGrid}></div>

        <div className={styles.loginCard}>
          <div className={styles.brand}>
            <div className={styles.logoCircle}>🎮</div>
            <h1>Arena Pro</h1>
            <p>Login with your staff name and PIN</p>
          </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Staff Name</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>👤</span>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name or email"
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pin">PIN</label>

            <div className={styles.pinMachine}>
              <div className={styles.pinScreenTop}>
                <span>Secure PIN Entry</span>
                <small>{form.pin.length}/6</small>
              </div>

              <div className={styles.pinSlots}>
                {[0, 1, 2, 3, 4, 5].map((slot) => (
                  <div key={slot} className={styles.pinSlot}>
                    {form.pin[slot] ? <span className={styles.pinDot}></span> : null}
                  </div>
                ))}
              </div>

              <input
                id="pin"
                type="password"
                name="pin"
                value={form.pin}
                onChange={handleChange}
                placeholder="Type PIN or use keypad"
                autoComplete="current-password"
                inputMode="numeric"
                className={styles.hiddenPinInput}
              />
            </div>
          </div>

          <div className={styles.keypadCard}>
            <div className={styles.keypadGrid}>
              {keypadNumbers.slice(0, 9).map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className={styles.keypadBtn}
                  onClick={() => handleKeypadPress(digit)}
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                className={`${styles.keypadBtn} ${styles.keypadAction}`}
                onClick={handleClearPin}
              >
                Clear
              </button>

              <button
                type="button"
                className={`${styles.keypadBtn} ${styles.keypadZero}`}
                onClick={() => handleKeypadPress("0")}
              >
                0
              </button>

              <button
                type="button"
                className={`${styles.keypadBtn} ${styles.keypadAction}`}
                onClick={handleBackspace}
              >
                ⌫
              </button>
            </div>
          </div>

          {error ? <div className={styles.errorText}>{error}</div> : null}

          <button type="submit" disabled={loading} className={styles.loginBtn}>
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
          <Link to="/clock" className={styles.clockLink}>
            Go to Clock In / Clock Out
          </Link>
        </form>
      </div>
    </div>
  );
}
