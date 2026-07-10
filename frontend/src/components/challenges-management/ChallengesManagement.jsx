import { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiCheckCircle,
  FiEdit2,
  FiPlusCircle,
  FiRefreshCw,
  FiTrash2
} from "react-icons/fi";
import {
  completeMemberChallenge,
  createMemberChallenge,
  deleteMemberChallenge,
  getMemberChallengeProgress,
  getMemberChallenges,
  getMembers,
  updateMemberChallenge
} from "../../api/membersApi";
import styles from "./ChallengesManagement.module.css";

const initialForm = {
  title: "",
  description: "",
  challenge_type: "product_count",
  target_value: "3",
  bonus_points: "50",
  badge_name: "",
  starts_at: "",
  ends_at: "",
  is_active: true
};

const challengeTypeLabels = {
  visit_count: "Visit count",
  spend_amount: "Spend amount",
  product_count: "Different items",
  category_count: "Different categories",
  points_earned: "Points earned",
  manual: "Manual review"
};

function formatDateTime(value) {
  if (!value) return "Open";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Open";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDateTimeLocal(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

export default function ChallengesManagement() {
  const [challenges, setChallenges] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [progressRows, setProgressRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMember = useMemo(() => {
    return members.find((member) => Number(member.id) === Number(selectedMemberId)) || null;
  }, [members, selectedMemberId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [challengeRes, memberRes] = await Promise.all([
        getMemberChallenges(),
        getMembers()
      ]);
      setChallenges(challengeRes?.data || []);
      setMembers(memberRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (memberId = selectedMemberId) => {
    if (!memberId) {
      setProgressRows([]);
      return;
    }

    try {
      const res = await getMemberChallengeProgress(memberId);
      setProgressRows(res?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load member progress");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProgress(selectedMemberId);
  }, [selectedMemberId]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Challenge title is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...form,
        target_value: Number(form.target_value || 1),
        bonus_points: Number(form.bonus_points || 0),
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null
      };

      const res = editingId
        ? await updateMemberChallenge(editingId, payload)
        : await createMemberChallenge(payload);

      setSuccess(res?.message || "Challenge saved");
      resetForm();
      await loadData();
      await loadProgress();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save challenge");
    } finally {
      setSaving(false);
    }
  };

  const editChallenge = (challenge) => {
    setEditingId(challenge.id);
    setForm({
      title: challenge.title || "",
      description: challenge.description || "",
      challenge_type: challenge.challenge_type || "product_count",
      target_value: String(challenge.target_value || 1),
      bonus_points: String(challenge.bonus_points || 0),
      badge_name: challenge.badge_name || "",
      starts_at: toDateTimeLocal(challenge.starts_at),
      ends_at: toDateTimeLocal(challenge.ends_at),
      is_active: !!Number(challenge.is_active)
    });
  };

  const removeChallenge = async (challenge) => {
    if (!window.confirm(`Delete challenge "${challenge.title}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await deleteMemberChallenge(challenge.id);
      setSuccess("Challenge deleted");
      await loadData();
      await loadProgress();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete challenge");
    }
  };

  const completeChallenge = async (challenge) => {
    if (!selectedMember) {
      setError("Select a member before completing a challenge");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const res = await completeMemberChallenge(challenge.id, {
        member_id: Number(selectedMember.id),
        progress_value: Number(challenge.target_value || 1),
        note: "Marked complete by staff"
      });
      setSuccess(res?.message || "Challenge completed");
      await loadData();
      await loadProgress(selectedMember.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to complete challenge");
    }
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Gamified Rewards</span>
          <h1>Challenges</h1>
          <p>Create missions members can complete for badges and bonus points.</p>
        </div>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={loadData}
          aria-label="Refresh challenges"
          title="Refresh challenges"
        >
          <FiRefreshCw />
        </button>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{editingId ? "Edit Challenge" : "Create Challenge"}</h2>
            <p>Set the goal, reward, active window, and member-facing description.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.formGroup}>
              <span>Title</span>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Play 3 different games" />
            </label>

            <label className={styles.formGroup}>
              <span>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Complete this mission this week to earn bonus points."
              />
            </label>

            <div className={styles.formGrid}>
              <label className={styles.formGroup}>
                <span>Challenge Type</span>
                <select name="challenge_type" value={form.challenge_type} onChange={handleChange}>
                  {Object.entries(challengeTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.formGroup}>
                <span>Target</span>
                <input type="number" min="1" step="1" name="target_value" value={form.target_value} onChange={handleChange} />
              </label>
              <label className={styles.formGroup}>
                <span>Bonus Points</span>
                <input type="number" min="0" step="1" name="bonus_points" value={form.bonus_points} onChange={handleChange} />
              </label>
              <label className={styles.formGroup}>
                <span>Badge Name</span>
                <input name="badge_name" value={form.badge_name} onChange={handleChange} placeholder="Game Explorer" />
              </label>
              <label className={styles.formGroup}>
                <span>Starts</span>
                <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={handleChange} />
              </label>
              <label className={styles.formGroup}>
                <span>Ends</span>
                <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={handleChange} />
              </label>
            </div>

            <label className={styles.toggleRow}>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              <span>Active challenge</span>
            </label>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                <FiPlusCircle />
                {saving ? "Saving..." : editingId ? "Update Challenge" : "Create Challenge"}
              </button>
              {editingId ? (
                <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Member Progress</h2>
            <p>Select a member to review missions and award completed challenges.</p>
          </div>

          <label className={styles.formGroup}>
            <span>Member</span>
            <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.member_code}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.progressList}>
            {selectedMemberId && progressRows.length ? (
              progressRows.map((challenge) => (
                <div key={challenge.id} className={styles.progressCard}>
                  <div>
                    <strong>{challenge.title}</strong>
                    <small>{challengeTypeLabels[challenge.challenge_type]} • +{challenge.bonus_points || 0} pts</small>
                  </div>
                  <div className={styles.progressTrack}>
                    <span style={{ width: `${challenge.progress_percent || 0}%` }} />
                  </div>
                  <div className={styles.progressMeta}>
                    <span>{Number(challenge.progress_value || 0).toLocaleString()} / {Number(challenge.target_value || 0).toLocaleString()}</span>
                    <button
                      type="button"
                      className={styles.completeBtn}
                      onClick={() => completeChallenge(challenge)}
                      disabled={challenge.is_completed}
                    >
                      <FiCheckCircle />
                      {challenge.is_completed ? "Completed" : "Complete"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                {selectedMemberId ? "No challenge progress found" : "Select a member to view missions"}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Challenge Library</h2>
            <p>All configured missions available to members.</p>
          </div>
        </div>

        <div className={styles.challengeGrid}>
          {loading ? (
            <div className={styles.emptyState}>Loading challenges...</div>
          ) : challenges.length ? (
            challenges.map((challenge) => (
              <article key={challenge.id} className={styles.challengeCard}>
                <div className={styles.challengeTop}>
                  <span className={styles.challengeIcon}><FiAward /></span>
                  <span className={Number(challenge.is_active) ? styles.activeBadge : styles.inactiveBadge}>
                    {Number(challenge.is_active) ? "Active" : "Inactive"}
                  </span>
                </div>
                <h3>{challenge.title}</h3>
                <p>{challenge.description || "No description added."}</p>
                <div className={styles.challengeMeta}>
                  <span>{challengeTypeLabels[challenge.challenge_type]}</span>
                  <span>Target {Number(challenge.target_value || 0).toLocaleString()}</span>
                  <span>+{Number(challenge.bonus_points || 0).toLocaleString()} pts</span>
                  {challenge.badge_name ? <span>{challenge.badge_name}</span> : null}
                </div>
                <small className={styles.dateLine}>
                  {formatDateTime(challenge.starts_at)} to {formatDateTime(challenge.ends_at)}
                </small>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => editChallenge(challenge)}>
                    <FiEdit2 /> Edit
                  </button>
                  <button type="button" className={styles.dangerBtn} onClick={() => removeChallenge(challenge)}>
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>No challenges created yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
