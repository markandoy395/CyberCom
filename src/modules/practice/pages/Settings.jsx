import { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import "./Settings.css";

export const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(() => {
    // Initialize state from localStorage to avoid extra render
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (_e) {
        // Use defaults if parsing fails
      }
    }
    return {
      emailNotifications: true,
      showLeaderboard: true,
      twoFactorAuth: false,
    };
  });

  const handleToggle = (setting) => {
    if (setting === "darkMode") {
      // Call the actual theme toggle function
      toggleTheme();
    } else {
      const updatedSettings = {
        ...settings,
        [setting]: !settings[setting],
      };
      setSettings(updatedSettings);
      // Auto-save to localStorage
      localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p>Customize your CyberCom experience</p>
      </div>

      <div className="settings-content">
        {/* Notifications Section */}
        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-item">
            <div className="setting-info">
              <label>Email Notifications</label>
              <p className="setting-description">
                Receive emails about challenge updates and leaderboard changes
              </p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle("emailNotifications")}
                id="emailNotification"
              />
              <label htmlFor="emailNotification"></label>
            </div>
          </div>
        </div>

        {/* Display Section */}
        <div className="settings-section">
          <h2>Display</h2>
          <div className="setting-item">
            <div className="setting-info">
              <label>{theme === "dark" ? "Dark Mode: ON" : "Light Mode: ON"}</label>
              <p className="setting-description">{theme === "dark" ? "Use dark theme throughout the app" : "Use light theme throughout the app"}</p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={() => handleToggle("darkMode")}
                id="darkMode"
              />
              <label htmlFor="darkMode"></label>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="settings-section">
          <h2>Privacy & Security</h2>
          <div className="setting-item">
            <div className="setting-info">
              <label>Show on Leaderboard</label>
              <p className="setting-description">Allow your profile to appear on the leaderboard</p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.showLeaderboard}
                onChange={() => handleToggle("showLeaderboard")}
                id="leaderboard"
              />
              <label htmlFor="leaderboard"></label>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <label>Two-Factor Authentication</label>
              <p className="setting-description">Add extra security to your account</p>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={() => handleToggle("twoFactorAuth")}
                id="twoFactor"
              />
              <label htmlFor="twoFactor"></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
