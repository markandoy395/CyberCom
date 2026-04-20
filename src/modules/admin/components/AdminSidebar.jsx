import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronDown } from "react-icons/io5";
import { FaChevronRight, FaChevronLeft, FaGear, FaCircleQuestion, FaRightFromBracket } from "react-icons/fa6";
import { getAdminSidebarNavItems } from "../config/adminSidebarConfig";
import { apiPost, API_ENDPOINTS } from "../../../utils/api";
import logo from "../../../assets/images/logo.png";
import "./AdminSidebar.css";

const SUBMENU_TAB_GROUPS = {
  competitions: new Set([
    "competitions",
    "competitions-dashboard",
    "select-challenges",
    "team-accounts",
    "scoring-simulator",
    "rankings",
    "liveMonitor",
  ]),
  rules: new Set(["rules", "practiceRules"]),
  "overall-rankings": new Set(["overallCompetitionRankings", "overallPracticeRankings"]),
};

const SIDEBAR_ID = "admin-sidebar-navigation";

// Sidebar Toggle Component
const SidebarToggle = ({ isCollapsed, onToggle, isHidden = false }) => (
  <button
    type="button"
    className={`sidebar-toggle-btn ${isCollapsed ? "collapsed" : "expanded"}`}
    onClick={onToggle}
    title={isCollapsed ? "Expand" : "Collapse"}
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    aria-expanded={!isCollapsed}
    aria-controls={SIDEBAR_ID}
    style={{ display: isHidden ? "none" : "flex" }}
  >
    {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
  </button>
);

const AdminSidebar = ({
  activeTab,
  onTabChange,
  isFullscreen = false,
  hasManageableCompetitions = false,
  isModalOpen = false,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  _competitionStatus = null,
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = typeof controlledIsCollapsed === "boolean"
    ? controlledIsCollapsed
    : internalIsCollapsed;
  const [expandedMenus, setExpandedMenus] = useState({});
  
  // Initialize adminData from localStorage on mount
  const [adminData] = useState(() => {
    const adminSession = localStorage.getItem("adminSession");
    if (adminSession) {
      try {
        return JSON.parse(adminSession);
      } catch {
        // Unable to parse session
      }
    }
    return null;
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const activeParentMenuId = Object.entries(SUBMENU_TAB_GROUPS).find(([, tabIds]) =>
      tabIds.has(activeTab)
    )?.[0];

    if (!activeParentMenuId) {
      return;
    }

    setExpandedMenus((prev) => (
      prev[activeParentMenuId]
        ? prev
        : { ...prev, [activeParentMenuId]: true }
    ));
  }, [activeTab]);

  // Handle logout - revoke token on backend and clear local storage
  const handleLogout = async () => {
    try {
      // Notify backend to revoke token
      await apiPost(API_ENDPOINTS.AUTH_LOGOUT_ADMIN);
    } catch (error) {
      console.warn('[Logout] Backend logout failed (token may already be expired):', error.message);
    } finally {
      // Clear all admin session data from localStorage
      const adminKeys = ["adminSession", "adminToken", "adminUsername", "adminTokenExpires", "adminRememberMe"];
      adminKeys.forEach(key => localStorage.removeItem(key));

      navigate("/admin/login");
    }
  };
  const handleToggleSidebar = () => {
    const nextCollapsed = !isCollapsed;

    if (typeof onToggleCollapse === "function") {
      startTransition(() => {
        onToggleCollapse(nextCollapsed);
      });
      return;
    }

    startTransition(() => {
      setInternalIsCollapsed(nextCollapsed);
    });
  };
  const handleOverlayClose = () => {
    if (typeof onToggleCollapse === "function") {
      startTransition(() => {
        onToggleCollapse(true);
      });
      return;
    }

    startTransition(() => {
      setInternalIsCollapsed(true);
    });
  };
  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const navItems = getAdminSidebarNavItems(hasManageableCompetitions);

  return (
    <>
      <div className={`admin-sidebar-group ${isCollapsed ? "collapsed" : "expanded"}`}>
        <aside
          id={SIDEBAR_ID}
          className={`admin-sidebar ${isCollapsed ? "collapsed" : "expanded"}`}
        >
        {/* Profile Section */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <img
              src={logo}
              alt={adminData?.username || "Admin"}
            />
          </div>
          {!isCollapsed && (
            <div className="profile-info">
              <p className="profile-role">{adminData?.role?.toUpperCase() || "ADMIN"}</p>
              <p className="profile-name">{adminData?.username?.toUpperCase() || "Admin"}</p>
            </div>
          )}
        </div>

        {/* Unified Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!isCollapsed && <span key="main-label" className="section-label">MAIN</span>}
            {navItems.map((item) => {
              const isParentActive = activeTab === item.id
                || item.subItems?.some((subItem) => subItem.id === activeTab);
              const isSubmenuVisible = item.submenu
                && (isFullscreen || expandedMenus[item.id]);

              return (
              <div key={item.id}>
                <button
                  type="button"
                  className={`nav-item ${isParentActive ? "active" : ""}`}
                  onClick={() => {
                    if (item.submenu) {
                      toggleMenu(item.id);
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  title={item.label}
                  aria-expanded={item.submenu ? isSubmenuVisible : undefined}
                >
                  <span className="nav-icon">
                    {item.icon && <item.icon />}
                  </span>
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {!isCollapsed && item.submenu && (
                    <IoChevronDown
                      className={`submenu-toggle ${isSubmenuVisible ? "expanded" : ""}`}
                    />
                  )}
                </button>

                {/* Submenu Items - Horizontal Pills */}
                {isSubmenuVisible && (
                  <div className="submenu-pills">
                    {item.subItems?.map((subItem) => (
                      <button
                        type="button"
                        key={subItem.id}
                        className={`submenu-pill ${activeTab === subItem.id ? "active" : ""}`}
                        onClick={() => onTabChange(subItem.id)}
                        title={subItem.label}
                      >
                        {subItem.icon && (
                          <span className="submenu-icon">
                            <subItem.icon />
                          </span>
                        )}
                        <span className="submenu-label">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* ── Utility Items (inline) ────────────────── */}
          <div className="nav-divider" />
          <div className="nav-section nav-section--utility">
            {!isCollapsed && <span key="settings-label" className="section-label">SETTINGS</span>}
            <button
              className="nav-item"
              title="Settings"
            >
              <span className="nav-icon">
                <FaGear />
              </span>
              {!isCollapsed && <span className="nav-label">Settings</span>}
            </button>
            <button
              className="nav-item"
              title="Help"
            >
              <span className="nav-icon">
                <FaCircleQuestion />
              </span>
              {!isCollapsed && <span className="nav-label">Help</span>}
            </button>
            <button
              className="nav-item nav-item--logout"
              onClick={handleLogout}
              title="Logout Account"
            >
              <span className="nav-icon">
                <FaRightFromBracket />
              </span>
              {!isCollapsed && <span className="nav-label">Logout Account</span>}
            </button>
          </div>
        </nav>

        </aside>

        <SidebarToggle 
          isCollapsed={isCollapsed} 
          onToggle={handleToggleSidebar}
          isHidden={isModalOpen}
        />
      </div>

      {/* Sidebar Overlay for Mobile */}
      <div
        className="sidebar-overlay"
        onClick={handleOverlayClose}
      />
    </>
  );
};

export default AdminSidebar;
