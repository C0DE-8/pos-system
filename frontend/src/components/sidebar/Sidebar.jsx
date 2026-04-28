// src/components/sidebar/Sidebar.jsx
import {
  FiGrid,
  FiBox,
  FiUsers,
  FiShoppingCart,
  FiTrendingUp,
  FiLayers,
  FiMap,
  FiUserCheck,
  FiSettings,
  FiBarChart2,
  FiEye,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import styles from "./Sidebar.module.css";

const ICONS = {
  Overview: <FiGrid />,
  Products: <FiBox />,
  Members: <FiUsers />,
  POS: <FiShoppingCart />,
  Sales: <FiTrendingUp />,
  Inventory: <FiLayers />,
  "Unit Hierarchy": <FiBox />,
  Courts: <FiMap />,
  Users: <FiUserCheck />,
  Settings: <FiSettings />,
  Reports: <FiBarChart2 />,
  Viewer: <FiEye />,
  Warehouse: <FiBox />
};

export default function Sidebar({
  role,
  menu,
  activeMenu,
  setActiveMenu,
  collapsed = false,
  onToggleCollapse
}) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.topArea}>
        <div className={styles.logoBox}>
          <h2>{collapsed ? "AP" : "Arena pro"}</h2>
          {!collapsed && <p>{role}</p>}
        </div>

        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <nav className={styles.navMenu}>
        {menu.map((item) => (
          <button
            key={item}
            className={`${styles.navItem} ${activeMenu === item ? styles.activeNavItem : ""}`}
            onClick={() => setActiveMenu(item)}
            title={collapsed ? item : ""}
          >
            <span className={styles.icon}>{ICONS[item] || <FiGrid />}</span>
            {!collapsed && <span className={styles.label}>{item}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
