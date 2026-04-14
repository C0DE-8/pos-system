// src/pages/auth/clock/ClockPage.jsx
import { useEffect, useState } from "react";
import {
  loginClockUser,
  logoutClockUser,
  saveClockSession,
  clearClockSession,
  getClockToken,
  getClockUser
} from "../../../api/authApi";
import styles from "./ClockPage.module.css";
import { Link } from "react-router-dom";

const keypadNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

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

export default function ClockPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [clockedUser, setClockedUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    pin: ""
  });

  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = getClockToken();
    const user = getClockUser();

    if (token && user && isTokenValid(token)) {
      setClockedUser(user);
    } else {
      clearClockSession();
    }

    setCheckingSession(false);
  }, []);

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

  const handleClockIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        pin: form.pin.trim()
      };

      const data = await loginClockUser(payload);

      if (!data?.token || !isTokenValid(data.token)) {
        clearClockSession();
        setError("Invalid or expired token returned from server");
        return;
      }

      saveClockSession(data.token, data.user);
      setClockedUser(data.user);
      setSuccess(`Clock in successful. Welcome, ${data.user.name}.`);
      setForm({
        name: "",
        pin: ""
      });
    } catch (err) {
      clearClockSession();
      setError(err?.response?.data?.message || err?.message || "Clock in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError("");
    setSuccess("");
    setLogoutLoading(true);

    try {
      const data = await logoutClockUser();
      const userName = clockedUser?.name || "Staff";

      clearClockSession();
      setClockedUser(null);
      setSuccess(data?.message || `${userName} clocked out successfully.`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Clock out failed");
    } finally {
      setLogoutLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className={styles.clockPage}>
        <div className={styles.bgGlowOne}></div>
        <div className={styles.bgGlowTwo}></div>
        <div className={styles.bgGrid}></div>

        <div className={styles.clockCard}>
          <div className={styles.brand}>
            <div className={styles.logoCircle}>🕒</div>
            <h1>Staff Clock</h1>
            <p>Checking clock session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.clockPage}>
      <div className={styles.bgGlowOne}></div>
      <div className={styles.bgGlowTwo}></div>
      <div className={styles.bgGrid}></div>

      <div className={styles.clockCard}>
        <div className={styles.brand}>
          <div className={styles.logoCircle}>🕒</div>
          <h1>Staff Clock</h1>
          <p>Clock in and clock out from here</p>
        </div>

        {!clockedUser ? (
          <form onSubmit={handleClockIn} className={styles.form}>
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
            {success ? <div className={styles.successText}>{success}</div> : null}

            <button type="submit" disabled={loading} className={styles.clockInBtn}>
              {loading ? "Clocking in..." : "Clock In"}
            </button>
          </form>
        ) : (
          <div className={styles.loggedInPanel}>
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>
                {clockedUser?.avatar ? (
                  <img src={clockedUser.avatar} alt={clockedUser.name} />
                ) : (
                  <span>{clockedUser?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>

              <h2>{clockedUser?.name}</h2>
              <p>{clockedUser?.email}</p>
              <span className={styles.roleBadge}>{clockedUser?.role}</span>
            </div>

            {error ? <div className={styles.errorText}>{error}</div> : null}
            {success ? <div className={styles.successText}>{success}</div> : null}

            <button
              type="button"
              onClick={handleClockOut}
              disabled={logoutLoading}
              className={styles.clockOutBtn}
            >
              {logoutLoading ? "Clocking out..." : "Clock Out"}
            </button>
                      <Link to="/" className={styles.clockLink}>
                        Go to Clock In / Clock Out
                      </Link>
          </div>
        )}
      </div>
    </div>
  );
}