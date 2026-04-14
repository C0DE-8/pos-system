import { useEffect, useMemo, useState } from "react";
import {
  getUsers,
  getUserById,
  toggleUserClock,
  getUserClockHistory,
  createUser,
  enableUser,
  disableUser,
  deleteUser,
  updateUserPermissions
} from "../../api/usersApi";
import styles from "./UsersManagement.module.css";

const emptyPermissions = {
  pos: false,
  courts: false,
  inventory: false,
  sales: false,
  members: false,
  users: false,
  settings: false,
  stockAdj: false,
  refunds: false,
  shifts: false,
  purchaseOrders: false,
  analytics: false,
  kds: false,
  giftCards: false
};

const roles = ["admin", "manager", "cashier", "viewer"];

const permissionLabels = {
  pos: "POS Access",
  courts: "Courts",
  inventory: "Inventory",
  sales: "Sales",
  members: "Members",
  users: "Users",
  settings: "Settings",
  stockAdj: "Stock Adjustment",
  refunds: "Refunds",
  shifts: "Shifts",
  purchaseOrders: "Purchase Orders",
  analytics: "Analytics",
  kds: "KDS",
  giftCards: "Gift Cards"
};

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${
            toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
              ? styles.toastError
              : styles.toastInfo
          }`}
        >
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>

          <button type="button" onClick={() => removeToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  onCancel,
  onConfirm,
  loading
}) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
        </div>

        <div className={styles.modalBody}>
          <p>{message}</p>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={
              confirmVariant === "danger" ? styles.dangerBtn : styles.primaryBtn
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({
  open,
  form,
  setForm,
  submitting,
  onClose,
  onSubmit,
  handlePermissionChange
}) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.largeModal}`}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Create User</h3>
            <p>Add a new staff account and assign permissions.</p>
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>PIN</label>
              <input
                type="password"
                value={form.pin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pin: e.target.value }))
                }
                placeholder="Enter user PIN"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Avatar</label>
              <input
                type="text"
                value={form.avatar}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, avatar: e.target.value }))
                }
                placeholder="👤"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value }))
                }
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.permissionsBox}>
            <h3>Initial Permissions</h3>
            <div className={styles.permissionsGridLarge}>
              {Object.keys(form.permissions).map((key) => (
                <label key={key} className={styles.permissionCard}>
                  <div className={styles.permissionCardText}>
                    <span className={styles.permissionTitle}>
                      {permissionLabels[key] || key}
                    </span>
                    <small>
                      {form.permissions[key]
                        ? "Access granted"
                        : "Access not granted"}
                    </small>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.permissions[key]}
                    onChange={() => handlePermissionChange(key)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button className={styles.primaryBtn} type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetailsModal({
  open,
  selectedUser,
  detailsLoading,
  activeTab,
  setActiveTab,
  permissionForm,
  handleSelectedUserPermissionChange,
  handleSavePermissions,
  savingPermissions,
  clockHistory,
  formatDateTime,
  onClose
}) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.userDetailsModal}`}>
        <div className={styles.modalHeader}>
          <div>
            <h3>User Information</h3>
            <p>View staff details, permissions, and clock history.</p>
          </div>

          <button type="button" className={styles.iconBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.userModalBody}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${
                activeTab === "details" ? styles.activeTabBtn : ""
              }`}
              onClick={() => setActiveTab("details")}
            >
              User Details
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${
                activeTab === "permissions" ? styles.activeTabBtn : ""
              }`}
              onClick={() => setActiveTab("permissions")}
            >
              Edit Permissions
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${
                activeTab === "history" ? styles.activeTabBtn : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              Clock History
            </button>
          </div>

          {detailsLoading ? (
            <div className={styles.infoBox}>Loading details...</div>
          ) : !selectedUser ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <h3>No user selected</h3>
              <p>Select a user to view details.</p>
            </div>
          ) : activeTab === "details" ? (
            <div className={styles.detailsBox}>
              <div className={styles.userHeader}>
                <div className={styles.largeAvatar}>
                  {selectedUser.avatar || "👤"}
                </div>

                <div className={styles.userMeta}>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email || "No email available"}</p>
                  <p>
                    <strong>Role:</strong> {selectedUser.role}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {selectedUser.is_active ? "Active" : "Disabled"}
                  </p>
                  <p>
                    <strong>Clock:</strong>{" "}
                    {selectedUser.clock?.is_clocked_in
                      ? "Clocked In"
                      : "Clocked Out"}
                  </p>
                  <p>
                    <strong>Last Time:</strong>{" "}
                    {formatDateTime(selectedUser.clock?.last_time)}
                  </p>
                </div>
              </div>

              <div className={styles.permissionsBox}>
                <h3>Current Permissions</h3>
                <div className={styles.permissionsStatusGrid}>
                  {Object.entries(selectedUser.permissions || {}).map(
                    ([key, value]) => (
                      <div key={key} className={styles.permissionStatus}>
                        <span>{permissionLabels[key] || key}</span>
                        <strong className={value ? styles.yesText : styles.noText}>
                          {value ? "Allowed" : "Blocked"}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "permissions" ? (
            <div className={styles.detailsBox}>
              <div className={styles.permissionsBox}>
                <h3>Edit Permissions for {selectedUser.name}</h3>
                <p className={styles.permissionsHint}>
                  Turn each access option on or off, then save your changes.
                </p>

                <div className={styles.permissionsGridLarge}>
                  {Object.keys(permissionForm).map((key) => (
                    <label key={key} className={styles.permissionCard}>
                      <div className={styles.permissionCardText}>
                        <span className={styles.permissionTitle}>
                          {permissionLabels[key] || key}
                        </span>
                        <small>
                          {permissionForm[key]
                            ? "Access granted"
                            : "Access not granted"}
                        </small>
                      </div>

                      <input
                        type="checkbox"
                        checked={permissionForm[key]}
                        onChange={() => handleSelectedUserPermissionChange(key)}
                      />
                    </label>
                  ))}
                </div>

                <div className={styles.permissionActionBar}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                  >
                    {savingPermissions ? "Saving..." : "Save Permissions"}
                  </button>
                </div>
              </div>
            </div>
          ) : clockHistory.length === 0 ? (
            <div className={styles.infoBox}>No clock history found.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Date / Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clockHistory.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{index + 1}</td>
                      <td>{item.event_type?.toUpperCase() || "—"}</td>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>
                        <span
                          className={
                            item.event_type === "in"
                              ? styles.clockIn
                              : styles.clockOut
                          }
                        >
                          {item.event_type === "in" ? "Clock In" : "Clock Out"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [clockHistory, setClockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [toasts, setToasts] = useState([]);

  const [form, setForm] = useState({
    name: "",
    pin: "",
    avatar: "👤",
    role: "cashier",
    permissions: { ...emptyPermissions }
  });

  const [permissionForm, setPermissionForm] = useState({ ...emptyPermissions });

  const addToast = (type, title, message = "") => {
    const id = Date.now() + Math.random();
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const resetForm = () => {
    setForm({
      name: "",
      pin: "",
      avatar: "👤",
      role: "cashier",
      permissions: { ...emptyPermissions }
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await getUsers();
      const incomingUsers = res?.data || [];
      setUsers(Array.isArray(incomingUsers) ? incomingUsers : []);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load users";
      setError(msg);
      addToast("error", "Load failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setError("");

      const [userRes, historyRes] = await Promise.all([
        getUserById(id),
        getUserClockHistory(id)
      ]);

      const userData = userRes?.data || null;

      setSelectedUser(userData);
      setClockHistory(historyRes?.data || []);
      setSelectedUserId(id);
      setPermissionForm({
        ...emptyPermissions,
        ...(userData?.permissions || {})
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load user details";
      setError(msg);
      addToast("error", "User details error", msg);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const uniqueUsers = Array.from(
      new Map((users || []).map((user) => [user.id, user])).values()
    );

    const term = search.trim().toLowerCase();
    if (!term) return uniqueUsers;

    return uniqueUsers.filter((user) => {
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const clockedIn = users.filter((u) => u.clock?.is_clocked_in).length;
    const admins = users.filter((u) => u.role === "admin").length;

    return { total, active, clockedIn, admins };
  }, [users]);

  const handleSelectUser = async (id) => {
    setActiveTab("details");
    setShowUserModal(true);
    await loadUserDetails(id);
  };

  const handlePermissionChange = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSelectedUserPermissionChange = (key) => {
    setPermissionForm((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      await createUser(form);

      setMessage("User created successfully");
      addToast("success", "User created", `${form.name} was added successfully.`);
      resetForm();
      setShowCreateModal(false);

      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create user";
      setError(msg);
      addToast("error", "Create failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;

    try {
      setSavingPermissions(true);
      setMessage("");
      setError("");

      const res = await updateUserPermissions(selectedUserId, permissionForm);

      const successMsg = res?.message || "Permissions updated successfully";
      setMessage(successMsg);
      addToast("success", "Permissions updated", successMsg);

      await loadUsers();
      await loadUserDetails(selectedUserId);
      setActiveTab("permissions");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update permissions";
      setError(msg);
      addToast("error", "Update failed", msg);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleClock = async (id) => {
    try {
      setMessage("");
      setError("");

      const res = await toggleUserClock(id);
      const successMsg = res?.message || "Clock action successful";
      setMessage(successMsg);
      addToast("success", "Clock updated", successMsg);

      await loadUsers();

      if (selectedUserId === id) {
        await loadUserDetails(id);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to clock user";
      setError(msg);
      addToast("error", "Clock action failed", msg);
    }
  };

  const handleEnable = async (id) => {
    try {
      setMessage("");
      setError("");

      const res = await enableUser(id);
      const successMsg = res?.message || "User enabled";
      setMessage(successMsg);
      addToast("success", "User enabled", successMsg);

      await loadUsers();

      if (selectedUserId === id) {
        await loadUserDetails(id);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to enable user";
      setError(msg);
      addToast("error", "Enable failed", msg);
    }
  };

  const handleDisable = async (id) => {
    try {
      setMessage("");
      setError("");

      const res = await disableUser(id);
      const successMsg = res?.message || "User disabled";
      setMessage(successMsg);
      addToast("success", "User disabled", successMsg);

      await loadUsers();

      if (selectedUserId === id) {
        await loadUserDetails(id);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to disable user";
      setError(msg);
      addToast("error", "Disable failed", msg);
    }
  };

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleteLoading(true);
      setMessage("");
      setError("");

      const res = await deleteUser(deleteTarget.id);
      const successMsg = res?.message || "User deleted";
      setMessage(successMsg);
      addToast("success", "User deleted", successMsg);

      if (selectedUserId === deleteTarget.id) {
        setSelectedUserId(null);
        setSelectedUser(null);
        setClockHistory([]);
        setPermissionForm({ ...emptyPermissions });
        setShowUserModal(false);
      }

      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete user";
      setError(msg);
      addToast("error", "Delete failed", msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <CreateUserModal
        open={showCreateModal}
        form={form}
        setForm={setForm}
        submitting={submitting}
        onClose={() => {
          if (submitting) return;
          setShowCreateModal(false);
        }}
        onSubmit={handleCreateUser}
        handlePermissionChange={handlePermissionChange}
      />

      <UserDetailsModal
        open={showUserModal}
        selectedUser={selectedUser}
        detailsLoading={detailsLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        permissionForm={permissionForm}
        handleSelectedUserPermissionChange={handleSelectedUserPermissionChange}
        handleSavePermissions={handleSavePermissions}
        savingPermissions={savingPermissions}
        clockHistory={clockHistory}
        formatDateTime={formatDateTime}
        onClose={() => setShowUserModal(false)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete ${
          deleteTarget?.name || "this user"
        }? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <section className={styles.hero}>
        <div>
          <h1>User Management</h1>
          <p>
            Manage staff accounts, control permissions, monitor clock status, and
            keep operations organized from one dashboard.
          </p>
        </div>

        <div className={styles.heroActions}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setShowCreateModal(true)}
          >
            + Create User
          </button>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Users</span>
          <strong>{stats.total}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Active Users</span>
          <strong>{stats.active}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Clocked In</span>
          <strong>{stats.clockedIn}</strong>
        </div>

        <div className={styles.statCard}>
          <span>Admins</span>
          <strong>{stats.admins}</strong>
        </div>
      </section>

      {(message || error) && (
        <div className={message ? styles.successBox : styles.errorBox}>
          {message || error}
        </div>
      )}

      <section className={styles.singleGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Staff Users</h2>
              <p className={styles.cardSubtext}>
                View, search, and manage all staff accounts from one place.
              </p>
            </div>
          </div>

          {loading ? (
            <div className={styles.infoBox}>Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.infoBox}>No users found.</div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Clock</th>
                      <th>Last Activity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={
                          selectedUserId === user.id ? styles.activeRow : ""
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => handleSelectUser(user.id)}
                          >
                            <span className={styles.avatar}>
                              {user.avatar || "👤"}
                            </span>
                            <span className={styles.userText}>
                              <strong>{user.name}</strong>
                              <small>{user.email || "No email"}</small>
                            </span>
                          </button>
                        </td>

                        <td>
                          <span className={styles.roleBadge}>{user.role}</span>
                        </td>

                        <td>
                          <span
                            className={
                              user.is_active
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {user.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              user.clock?.is_clocked_in
                                ? styles.clockIn
                                : styles.clockOut
                            }
                          >
                            {user.clock?.is_clocked_in
                              ? "Clocked In"
                              : "Clocked Out"}
                          </span>
                        </td>

                        <td>{formatDateTime(user.clock?.last_time)}</td>

                        <td>
                          <div className={styles.actionRow}>
                            <button
                              type="button"
                              className={styles.smallBtn}
                              onClick={() => handleToggleClock(user.id)}
                            >
                              Clock
                            </button>

                            {user.is_active ? (
                              <button
                                type="button"
                                className={styles.warnBtn}
                                onClick={() => handleDisable(user.id)}
                              >
                                Disable
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.successBtn}
                                onClick={() => handleEnable(user.id)}
                              >
                                Enable
                              </button>
                            )}

                            <button
                              type="button"
                              className={styles.primaryBtn}
                              onClick={() => handleSelectUser(user.id)}
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={() => openDeleteModal(user)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileUsersList}>
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`${styles.mobileUserCard} ${
                      selectedUserId === user.id ? styles.mobileActiveCard : ""
                    }`}
                  >
                    <div className={styles.mobileUserTop}>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => handleSelectUser(user.id)}
                      >
                        <span className={styles.avatar}>{user.avatar || "👤"}</span>
                        <span className={styles.userText}>
                          <strong>{user.name}</strong>
                          <small>{user.email || "No email"}</small>
                        </span>
                      </button>

                      <span className={styles.roleBadge}>{user.role}</span>
                    </div>

                    <div className={styles.mobileMetaGrid}>
                      <div>
                        <span>Status</span>
                        <strong
                          className={
                            user.is_active
                              ? styles.statusActive
                              : styles.statusInactive
                          }
                        >
                          {user.is_active ? "Active" : "Disabled"}
                        </strong>
                      </div>

                      <div>
                        <span>Clock</span>
                        <strong
                          className={
                            user.clock?.is_clocked_in
                              ? styles.clockIn
                              : styles.clockOut
                          }
                        >
                          {user.clock?.is_clocked_in
                            ? "Clocked In"
                            : "Clocked Out"}
                        </strong>
                      </div>

                      <div className={styles.mobileFullWidth}>
                        <span>Last Activity</span>
                        <strong>{formatDateTime(user.clock?.last_time)}</strong>
                      </div>
                    </div>

                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={() => handleToggleClock(user.id)}
                      >
                        Clock
                      </button>

                      {user.is_active ? (
                        <button
                          type="button"
                          className={styles.warnBtn}
                          onClick={() => handleDisable(user.id)}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.successBtn}
                          onClick={() => handleEnable(user.id)}
                        >
                          Enable
                        </button>
                      )}

                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => handleSelectUser(user.id)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => openDeleteModal(user)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}