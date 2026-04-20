import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { BiChevronDown, BiUser, BiTrendingUp, BiHelpCircle } from "../../../utils/icons";
import { FaPencil } from "../../../utils/icons";
import logo from "../../../assets/images/logo.png";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHidden, setIsHidden] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const lastScrollY = useRef(0);
  const tickingRef = useRef(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          // Hide navbar when scrolling down, show when scrolling up
          if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
            setIsHidden(true);
          } else if (currentScrollY < lastScrollY.current) {
            setIsHidden(false);
          }

          lastScrollY.current = currentScrollY;
          tickingRef.current = false;
        });
        tickingRef.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const isActive = (path) => location.pathname === path;

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const userName = user?.username || user?.email?.split("@")[0] || "User";
  const userProfileImage = user?.profileImage || null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsDropdownOpen(false);
    navigate("/login");
  };

  return (
    <nav className={`navbar ${isHidden ? "navbar-hidden" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="CyberCom Logo" className="navbar-logo-img" />
          <h1>CyberCom</h1>
        </Link>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link
              to="/"
              className={`navbar-link ${isActive("/") ? "active" : ""}`}
            >
              Home
            </Link>
          </li>
          <li className="navbar-item">
            <Link
              to="/competition/login"
              className={`navbar-link ${location.pathname.startsWith("/competition") ? "active" : ""}`}
            >
              Competition
            </Link>
          </li>
          <li className="navbar-item">
            <Link
              to="/leaderboard"
              className={`navbar-link ${
                isActive("/leaderboard") ? "active" : ""
              }`}
            >
              Leaderboard
            </Link>
          </li>
        </ul>

        {/* User Dropdown */}
        <div className="navbar-user-menu" ref={dropdownRef}>
          <button
            className="navbar-user-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title={userName}
          >
            <span className="user-avatar">
              {userProfileImage ? (
                <img src={userProfileImage} alt={userName} className="avatar-image" />
              ) : (
                <BiUser className="avatar-icon" />
              )}
            </span>
            <span className="user-name">{userName}</span>
            <BiChevronDown className={`dropdown-chevron ${isDropdownOpen ? "open" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <Link
                to="/profile"
                className="dropdown-item"
                onClick={() => setIsDropdownOpen(false)}
              >
                <BiUser className="dropdown-icon" />
                <span>My Profile</span>
              </Link>
              <div className="dropdown-divider"></div>
              <Link
                to="/settings"
                className="dropdown-item"
                onClick={() => setIsDropdownOpen(false)}
              >
                <FaPencil className="dropdown-icon" />
                <span>Settings</span>
              </Link>
              <Link
                to="/statistics"
                className="dropdown-item"
                onClick={() => setIsDropdownOpen(false)}
              >
                <BiTrendingUp className="dropdown-icon" />
                <span>Statistics</span>
              </Link>
              <Link
                to="/help"
                className="dropdown-item"
                onClick={() => setIsDropdownOpen(false)}
              >
                <BiHelpCircle className="dropdown-icon" />
                <span>Help & Support</span>
              </Link>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item dropdown-logout"
                onClick={handleLogout}
              >
                <span style={{ fontSize: "16px" }}>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
