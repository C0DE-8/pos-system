import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiDollarSign,
  FiUsers,
  FiMapPin,
  FiCreditCard,
  FiMenu,
  FiHome,
  FiBox,
  FiSettings,
  FiTrendingUp,
  FiBarChart2,
  FiGrid,
  FiBell,
  FiAlertTriangle,
  FiX
} from "react-icons/fi";

import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import StatCard from "../../components/stat-card/StatCard";
import QuickActions from "../../components/quick-actions/QuickActions";
import CurrentView from "../../components/current-view/CurrentView";
import PermissionsSummary from "../../components/permissions-summary/PermissionsSummary";
import DashboardLoader from "../../components/dashboard-loader/DashboardLoader";
import UsersManagement from "../../components/users-management/UsersManagement";
import InventoryManagement from "../../components/inventory-management/InventoryManagement";
import UnitHierarchyManagement from "../../components/unit-hierarchy-management/UnitHierarchyManagement";
import WarehouseManagement from "../../components/warehouse-management/WarehouseManagement";
import POSManagement from "../../components/pos-management/POSManagement";
import CourtsManagement from "../../components/courts-management/CourtsManagement";
import SalesManagement from "../../components/sales-management/SalesManagement";
import MembersManagement from "../../components/members-management/MembersManagement";
import SettingsManagement from "../../components/settings-management/SettingsManagement";
import ReportsManagement from "../../components/reports-management/ReportsManagement";
import MobileSidebarHead from "../../components/mobile-sidebar-head/MobileSidebarHead";

import useDashboard from "../../hooks/useDashboard";
import { getMe, logoutUser } from "../../api/authApi";
import { getExpiryAlerts } from "../../api/settingsApi";
import {
  hasPermission,
  normalizePermissions,
  isAdmin
} from "../../utils/permissions";

import styles from "./Dashboard.module.css";

const STAT_ICONS = {
  "Total Users": <FiUsers />,
  Products: <FiBox />,
  Sales: <FiTrendingUp />,
  Revenue: <FiDollarSign />,
  Members: <FiUsers />,
  Courts: <FiMapPin />
};

const MENU_ITEMS = [
  { label: "Overview", permission: null, icon: <FiHome /> },
  { label: "POS", permission: "pos", icon: <FiCreditCard /> },
  { label: "Courts", permission: "courts", icon: <FiMapPin /> },
  { label: "Inventory", permission: "inventory", icon: <FiBox /> },
  { label: "Unit Hierarchy", permission: "inventory", icon: <FiBox /> },
  { label: "Warehouse", permission: "inventory", icon: <FiBox /> },
  { label: "Sales", permission: "sales", icon: <FiTrendingUp /> },
  { label: "Reports", permission: "analytics", icon: <FiBarChart2 /> },
  { label: "Members", permission: "members", icon: <FiUsers /> },
  { label: "Users", permission: "users", icon: <FiUsers /> },
  { label: "Settings", permission: "settings", icon: <FiSettings /> }
];

const getDefaultMenuByRole = (role) => {
  switch ((role || "").toLowerCase()) {
    case "cashier":
      return "POS";
    case "viewer":
      return "Sales";
    case "admin":
    case "manager":
    default:
      return "Overview";
  }
};

const getMenuStorageKey = (user) => {
  const id = user?.id || user?._id || user?.email || user?.username || "guest";
  return `dashboardActiveMenu_${id}`;
};

const getSidebarCollapseStorageKey = (user) => {
  const id = user?.id || user?._id || user?.email || user?.username || "guest";
  return `dashboardSidebarCollapsed_${id}`;
};

const getExpiryStatusClass = (daysLeft) => {
  if (daysLeft <= 1) return styles.expiryBadgeDanger;
  if (daysLeft <= 3) return styles.expiryBadgeWarning;
  return styles.expiryBadgeInfo;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState(() => {
    return localStorage.getItem("dashboardActiveMenu") || "";
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [currentPermissions, setCurrentPermissions] = useState({});
  const [bootLoading, setBootLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expiryAlertEnabled, setExpiryAlertEnabled] = useState(false);
  const [expiryAlertDays, setExpiryAlertDays] = useState(7);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryError, setExpiryError] = useState("");

  const { dashboardData, loading, refreshing, error, refetch } = useDashboard();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await getMe();
        const user = res?.user || null;
        const permissions = normalizePermissions(user, res?.permissions);

        setCurrentUser(user);
        setCurrentPermissions(permissions);

        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("permissions", JSON.stringify(permissions));

        if (user) {
          const collapseKey = getSidebarCollapseStorageKey(user);
          const savedCollapsed = localStorage.getItem(collapseKey);
          setSidebarCollapsed(savedCollapsed === "true");
        }
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("permissions");
        localStorage.removeItem("dashboardActiveMenu");
        navigate("/");
      } finally {
        setBootLoading(false);
      }
    };

    loadCurrentUser();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const role = currentUser?.role || "viewer";

  const menu = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(currentUser, currentPermissions, item.permission);
    });
  }, [currentUser, currentPermissions]);

  const menuLabels = useMemo(() => {
    return menu.map((item) => item.label);
  }, [menu]);

  useEffect(() => {
    if (!currentUser || !menuLabels.length) return;

    const userStorageKey = getMenuStorageKey(currentUser);
    const oldSavedMenu = localStorage.getItem("dashboardActiveMenu");
    const savedMenu = localStorage.getItem(userStorageKey) || oldSavedMenu;
    const defaultMenu = getDefaultMenuByRole(role);

    let nextMenu = "";

    if (savedMenu && menuLabels.includes(savedMenu)) {
      nextMenu = savedMenu;
    } else if (menuLabels.includes(defaultMenu)) {
      nextMenu = defaultMenu;
    } else {
      nextMenu = menuLabels[0];
    }

    setActiveMenu(nextMenu);
    localStorage.setItem("dashboardActiveMenu", nextMenu);
    localStorage.setItem(userStorageKey, nextMenu);
    setMenuReady(true);
  }, [currentUser, role, menuLabels]);

  useEffect(() => {
    if (!currentUser || !activeMenu) return;

    const userStorageKey = getMenuStorageKey(currentUser);
    localStorage.setItem("dashboardActiveMenu", activeMenu);
    localStorage.setItem(userStorageKey, activeMenu);
  }, [activeMenu, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const collapseKey = getSidebarCollapseStorageKey(currentUser);
    localStorage.setItem(collapseKey, String(sidebarCollapsed));
  }, [sidebarCollapsed, currentUser]);

  useEffect(() => {
    if (!currentUser || !menuLabels.length || !activeMenu) return;

    if (!menuLabels.includes(activeMenu)) {
      const fallbackMenu = menuLabels.includes(getDefaultMenuByRole(role))
        ? getDefaultMenuByRole(role)
        : menuLabels[0];

      setActiveMenu(fallbackMenu);

      const userStorageKey = getMenuStorageKey(currentUser);
      localStorage.setItem("dashboardActiveMenu", fallbackMenu);
      localStorage.setItem(userStorageKey, fallbackMenu);
    }
  }, [menuLabels, activeMenu, role, currentUser]);

  useEffect(() => {
    const loadExpiryAlerts = async () => {
      if (!hasPermission(currentUser, currentPermissions, "settings")) {
        setExpiryAlerts([]);
        setExpiryAlertEnabled(false);
        setShowExpiryModal(false);
        return;
      }

      try {
        setExpiryLoading(true);
        setExpiryError("");

        const res = await getExpiryAlerts();

        const list = Array.isArray(res?.data) ? res.data : [];
        const enabled = !!res?.enabled;
        const alertDays = Number(res?.alert_days ?? 7);

        setExpiryAlerts(list);
        setExpiryAlertEnabled(enabled);
        setExpiryAlertDays(alertDays);

        if (enabled && list.length > 0) {
          const hiddenKey = `expiryAlertHidden_${new Date().toISOString().slice(0, 10)}`;
          const alreadyHidden = localStorage.getItem(hiddenKey) === "true";
          setShowExpiryModal(!alreadyHidden);
        } else {
          setShowExpiryModal(false);
        }
      } catch (err) {
        setExpiryError(
          err?.response?.data?.message || err?.message || "Failed to load expiry alerts"
        );
        setExpiryAlerts([]);
        setExpiryAlertEnabled(false);
        setShowExpiryModal(false);
      } finally {
        setExpiryLoading(false);
      }
    };

    loadExpiryAlerts();
  }, [currentUser, currentPermissions]);

  const quickActions = useMemo(() => {
    const actions = [];

    if (hasPermission(currentUser, currentPermissions, "pos")) actions.push("Open POS");
    if (hasPermission(currentUser, currentPermissions, "courts")) actions.push("Manage Courts");
    if (hasPermission(currentUser, currentPermissions, "inventory")) actions.push("Check Inventory");
    if (hasPermission(currentUser, currentPermissions, "inventory")) actions.push("Open Warehouse");
    if (hasPermission(currentUser, currentPermissions, "members")) actions.push("Find Member");
    if (hasPermission(currentUser, currentPermissions, "sales")) actions.push("View Sales");
    if (hasPermission(currentUser, currentPermissions, "analytics")) actions.push("Open Reports");
    if (hasPermission(currentUser, currentPermissions, "users")) actions.push("Manage Users");
    if (hasPermission(currentUser, currentPermissions, "settings")) actions.push("System Settings");

    return actions.length ? actions : ["View Dashboard"];
  }, [currentUser, currentPermissions]);

  const stats = useMemo(() => {
    if (!dashboardData?.data) return [];
    const data = dashboardData.data;

    if (isAdmin(currentUser)) {
      return [
        {
          title: "Total Users",
          value: data.users ?? 0,
          note: "People using Arena Pro"
        },
        {
          title: "Products",
          value: data.products ?? 0,
          note: "Items available in store"
        },
        {
          title: "Sales",
          value: data.sales ?? 0,
          note: "Sales made so far"
        },
        {
          title: "Revenue",
          value: `₦${Number(data.revenue ?? 0).toLocaleString()}`,
          note: "Total income recorded"
        }
      ];
    }

    const cards = [];

    if (hasPermission(currentUser, currentPermissions, "sales")) {
      cards.push({
        title: "Sales",
        value: data.sales ?? 0,
        note: "Sales made so far"
      });

      cards.push({
        title: "Revenue",
        value: `₦${Number(data.revenue ?? 0).toLocaleString()}`,
        note: "Total income recorded"
      });
    }

    if (hasPermission(currentUser, currentPermissions, "members")) {
      cards.push({
        title: "Members",
        value: data.members ?? 0,
        note: "Registered members"
      });
    }

    if (hasPermission(currentUser, currentPermissions, "courts")) {
      cards.push({
        title: "Courts",
        value: data.courts ?? 0,
        note: "Available play spaces"
      });
    }

    if (hasPermission(currentUser, currentPermissions, "inventory")) {
      cards.push({
        title: "Products",
        value: data.products ?? 0,
        note: "Items available in store"
      });
    }

    return cards;
  }, [dashboardData, currentUser, currentPermissions]);

  const bottomNavItems = useMemo(() => {
    const preferredOrder = ["Overview", "POS", "Inventory", "Unit Hierarchy", "Settings"];
    return preferredOrder
      .map((label) => menu.find((item) => item.label === label))
      .filter(Boolean)
      .slice(0, 5);
  }, [menu]);

  const expiryAlertCount = expiryAlerts.length;

  const clearAuthAndGoLogin = () => {
    if (currentUser) {
      const userStorageKey = getMenuStorageKey(currentUser);
      const collapseKey = getSidebarCollapseStorageKey(currentUser);
      localStorage.removeItem(userStorageKey);
      localStorage.removeItem(collapseKey);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    localStorage.removeItem("dashboardActiveMenu");
    navigate("/");
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setSidebarOpen(false);
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
      clearAuthAndGoLogin();
    }
  };

  const handleMenuChange = (label) => {
    setActiveMenu(label);

    if (currentUser) {
      const userStorageKey = getMenuStorageKey(currentUser);
      localStorage.setItem(userStorageKey, label);
    }

    localStorage.setItem("dashboardActiveMenu", label);
    setSidebarOpen(false);
  };

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleCloseExpiryModal = () => {
    const hiddenKey = `expiryAlertHidden_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(hiddenKey, "true");
    setShowExpiryModal(false);
  };

  const handleOpenExpiryModal = () => {
    if (!expiryAlertCount) return;
    setShowExpiryModal(true);
  };

  if (bootLoading || loading || !menuReady) {
    return (
      <div className={styles.dashboardPage}>
        <DashboardLoader />
      </div>
    );
  }

  const renderMainContent = () => {
    if (activeMenu === "Overview") {
      return (
        <>
          <section className={styles.cardsGrid}>
            {stats.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                note={card.note}
                icon={STAT_ICONS[card.title] || <FiGrid />}
              />
            ))}
          </section>

          <section className={styles.sectionGrid}>
            <QuickActions actions={quickActions} />
            <CurrentView
              activeMenu={activeMenu}
              role={role}
              permissions={currentPermissions}
            />
          </section>

          <PermissionsSummary
            user={currentUser}
            permissions={currentPermissions}
          />
        </>
      );
    }

    if (activeMenu === "POS" && hasPermission(currentUser, currentPermissions, "pos")) {
      return (
        <section className={styles.fullSection}>
          <POSManagement />
        </section>
      );
    }

    if (activeMenu === "Courts" && hasPermission(currentUser, currentPermissions, "courts")) {
      return (
        <section className={styles.fullSection}>
          <CourtsManagement />
        </section>
      );
    }

    if (activeMenu === "Sales" && hasPermission(currentUser, currentPermissions, "sales")) {
      return (
        <section className={styles.fullSection}>
          <SalesManagement />
        </section>
      );
    }

    if (activeMenu === "Reports" && hasPermission(currentUser, currentPermissions, "analytics")) {
      return (
        <section className={styles.fullSection}>
          <ReportsManagement />
        </section>
      );
    }

    if (activeMenu === "Members" && hasPermission(currentUser, currentPermissions, "members")) {
      return (
        <section className={styles.fullSection}>
          <MembersManagement />
        </section>
      );
    }

    if (activeMenu === "Users" && hasPermission(currentUser, currentPermissions, "users")) {
      return (
        <section className={styles.fullSection}>
          <UsersManagement />
        </section>
      );
    }

    if (activeMenu === "Inventory" && hasPermission(currentUser, currentPermissions, "inventory")) {
      return (
        <section className={styles.fullSection}>
          <InventoryManagement />
        </section>
      );
    }

    if (activeMenu === "Unit Hierarchy" && hasPermission(currentUser, currentPermissions, "inventory")) {
      return (
        <section className={styles.fullSection}>
          <UnitHierarchyManagement />
        </section>
      );
    }

    if (activeMenu === "Warehouse" && hasPermission(currentUser, currentPermissions, "inventory")) {
      return (
        <section className={styles.fullSection}>
          <WarehouseManagement />
        </section>
      );
    }

    if (activeMenu === "Settings" && hasPermission(currentUser, currentPermissions, "settings")) {
      return (
        <section className={styles.fullSection}>
          <SettingsManagement />
        </section>
      );
    }

    return (
      <section className={styles.sectionGrid}>
        <CurrentView
          activeMenu={activeMenu}
          role={role}
          permissions={currentPermissions}
        />
      </section>
    );
  };

  return (
    <div
      className={`${styles.dashboardPage} ${
        sidebarCollapsed ? styles.dashboardPageCollapsed : ""
      }`}
    >
      {sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`${styles.sidebarShell} ${sidebarOpen ? styles.sidebarOpen : ""} ${
          sidebarCollapsed ? styles.sidebarShellCollapsed : ""
        }`}
      >
        <MobileSidebarHead
          title="Arena Pro"
          subtitle="Dashboard Menu"
          user={currentUser}
          role={role}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          expiryAlertCount={expiryAlertCount}
        />

        <Sidebar
          role={role}
          menu={menuLabels}
          activeMenu={activeMenu}
          setActiveMenu={handleMenuChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.mobileTopbar}>
          <div className={styles.mobileTopbarLeft}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FiMenu />
            </button>

            <div className={styles.mobileHeadingBlock}>
              <h2 className={styles.mobileTitle}>Arena Pro</h2>
              <p className={styles.mobileSubtitle}>{activeMenu}</p>
            </div>
          </div>

          <div className={styles.mobileTopbarActions}>
            {hasPermission(currentUser, currentPermissions, "settings") && (
              <button
                type="button"
                className={`${styles.alertBellBtn} ${
                  expiryAlertCount > 0 ? styles.alertBellBtnActive : ""
                }`}
                onClick={handleOpenExpiryModal}
                disabled={!expiryAlertCount}
                aria-label="Open expiry alerts"
              >
                <FiBell />
                {expiryAlertCount > 0 && (
                  <span className={styles.alertBellCount}>{expiryAlertCount}</span>
                )}
              </button>
            )}

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => refetch(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className={styles.desktopNavbar}>
          <Navbar
            user={currentUser}
            role={role}
            title={isAdmin(currentUser) ? "Admin Dashboard" : "Staff Dashboard"}
            subtitle={
              isAdmin(currentUser)
                ? "Manage everything in one place"
                : "Access the tools available to you"
            }
            onRefresh={() => refetch(true)}
            onLogout={handleLogout}
            refreshing={refreshing}
          />
        </div>

        {hasPermission(currentUser, currentPermissions, "settings") &&
          expiryAlertEnabled && (
            <div className={styles.expiryInlineBar}>
              <div className={styles.expiryInlineLeft}>
                <div className={styles.expiryInlineIcon}>
                  <FiAlertTriangle />
                </div>

                <div className={styles.expiryInlineText}>
                  <h4>Expiry Alerts</h4>
                  <p>
                    {expiryLoading
                      ? "Checking products close to expiry..."
                      : expiryAlertCount > 0
                      ? `${expiryAlertCount} item(s) are expiring within ${expiryAlertDays} day(s).`
                      : `No items are expiring within ${expiryAlertDays} day(s).`}
                  </p>
                </div>
              </div>

              <div className={styles.expiryInlineActions}>
                {expiryAlertCount > 0 && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleOpenExpiryModal}
                  >
                    View Alerts
                  </button>
                )}
              </div>
            </div>
          )}

        {expiryError && (
          <div className={styles.errorBox}>{expiryError}</div>
        )}

        {error ? (
          <div className={styles.errorBox}>{error}</div>
        ) : (
          renderMainContent()
        )}
      </main>

      <nav className={styles.mobileBottomNav}>
        {bottomNavItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`${styles.bottomNavItem} ${
              activeMenu === item.label ? styles.bottomNavItemActive : ""
            }`}
            onClick={() => handleMenuChange(item.label)}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      {showExpiryModal && (
        <div className={styles.expiryModalOverlay} onClick={handleCloseExpiryModal}>
          <div
            className={styles.expiryModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.expiryModalHeader}>
              <div className={styles.expiryModalTitleWrap}>
                <div className={styles.expiryModalIcon}>
                  <FiBell />
                </div>

                <div>
                  <h3 className={styles.expiryModalTitle}>Expiry Alerts</h3>
                  <p className={styles.expiryModalSubtitle}>
                    Products expiring within {expiryAlertDays} day(s)
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={styles.expiryCloseBtn}
                onClick={handleCloseExpiryModal}
                aria-label="Close expiry alerts"
              >
                <FiX />
              </button>
            </div>

            <div className={styles.expiryModalBody}>
              {expiryAlertCount === 0 ? (
                <div className={styles.expiryEmptyState}>
                  <FiBell />
                  <p>No expiring items right now.</p>
                </div>
              ) : (
                <div className={styles.expiryList}>
                  {expiryAlerts.map((item) => (
                    <div key={item.id} className={styles.expiryItem}>
                      <div className={styles.expiryItemMain}>
                        <div className={styles.expiryItemTop}>
                          <div className={styles.expiryItemNameWrap}>
                            <span className={styles.expiryItemIcon}>
                              {item.icon || "📦"}
                            </span>
                            <div>
                              <h4 className={styles.expiryItemName}>{item.name}</h4>
                              <p className={styles.expiryItemMeta}>
                                {item.category_name || "Uncategorized"} • Stock:{" "}
                                {item.stock ?? 0}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`${styles.expiryBadge} ${getExpiryStatusClass(
                              Number(item.days_left ?? 0)
                            )}`}
                          >
                            {Number(item.days_left ?? 0) === 0
                              ? "Expires today"
                              : Number(item.days_left ?? 0) === 1
                              ? "1 day left"
                              : `${item.days_left} days left`}
                          </span>
                        </div>

                        <div className={styles.expiryItemBottom}>
                          <span className={styles.expiryDate}>
                            Expiry Date: {item.expiry_formatted || item.expiry_date}
                          </span>
                          <span className={styles.expiryHuman}>
                            {item.expiry_human || ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.expiryModalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleCloseExpiryModal}
              >
                Close
              </button>

              {hasPermission(currentUser, currentPermissions, "settings") && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    handleCloseExpiryModal();
                    handleMenuChange("Settings");
                  }}
                >
                  Open Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
