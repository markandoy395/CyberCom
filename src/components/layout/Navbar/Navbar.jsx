import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { NAV_LINKS } from "../../utils/constants";
import UserDropdown from "../common/UserDropdown";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const shouldShowLink = (link) => {
    if (link.adminOnly && !isAdmin()) return false;
    if (link.requireAuth && !isAuthenticated) return false;
    return true;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">CTF Platform</span>
        </Link>

        {/* Navigation Links */}
        <ul className="navbar-menu">
          {NAV_LINKS.map(
            (link) =>
              shouldShowLink(link) && (
                <li key={link.path} className="navbar-item">
                  <Link
                    to={link.path}
                    className={`navbar-link ${
                      isActive(link.path) ? "active" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
          )}
        </ul>

        {/* Right Section */}
        <div className="navbar-right">
          {/* Theme Toggle */}
          <button
            className="theme-toggle btn-ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* User Menu or Login */}
          {isAuthenticated ? (
            <UserDropdown />
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
