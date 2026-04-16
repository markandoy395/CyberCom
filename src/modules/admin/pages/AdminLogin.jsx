import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseExpiresInMs } from "../../../utils/api";
import "./AdminLogin.css";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem("adminUsername");
    const wasRemembered = localStorage.getItem("adminRememberMe");

    if (wasRemembered === "true" && savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async event => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("adminToken", data.token);

        if (data.expiresIn) {
          const expirationTime = new Date(
            Date.now() + parseExpiresInMs(data.expiresIn)
          ).toISOString();
          localStorage.setItem("adminTokenExpires", expirationTime);
        }

        if (rememberMe) {
          localStorage.setItem("adminUsername", username);
          localStorage.setItem("adminRememberMe", "true");
        } else {
          localStorage.removeItem("adminUsername");
          localStorage.removeItem("adminRememberMe");
        }

        const role = data.admin?.role || data.admin?.admin_role || data.role || "admin";
        const adminSession = {
          isAdmin: true,
          username: data.admin.username,
          admin_id: data.admin.id,
          role,
          token: data.token,
          tokenExpiresAt: localStorage.getItem("adminTokenExpires"),
          loginTime: new Date().toISOString(),
        };

        localStorage.setItem("adminSession", JSON.stringify(adminSession));
        navigate("/admin/dashboard");
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch {
      setError("Connection error. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1 className="admin-login-title">Admin Portal</h1>
          <p className="admin-login-subtitle">Secure Access Required</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          {error && <div className="admin-login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="rememberMe"
              className="form-checkbox"
              checked={rememberMe}
              onChange={event => setRememberMe(event.target.checked)}
              disabled={loading}
            />
            <label htmlFor="rememberMe" className="checkbox-label">
              Remember me
            </label>
          </div>

          <button type="submit" className="admin-login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="admin-login-footer">
          <p className="footer-text">
            Don't have an account?
            <Link to="/admin/register" className="register-link"> Create one</Link>
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "12px",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Note: test credentials are pre-filled for development purposes only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
