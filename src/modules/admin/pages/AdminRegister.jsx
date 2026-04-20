import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ActionButton from "../../../common/ActionButton";
import "./AdminLogin.css";

const AdminRegister = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/login/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess("Admin account created successfully! Redirecting to login...");
        
        // Clear form
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/admin/login");
        }, 2000);
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Make sure XAMPP is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1 className="admin-login-title">Create Admin Account</h1>
          <p className="admin-login-subtitle">Register a new administrator</p>
        </div>

        <form onSubmit={handleRegister} className="admin-login-form">
          {error && <div className="admin-login-error">{error}</div>}
          {success && <div className="admin-login-success">{success}</div>}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="Enter username (min 3 characters)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="Enter password (min 4 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="form-input"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <ActionButton
            type="submit"
            className="admin-login-button"
            variant="custom"
            size="custom"
            isLoading={loading}
            loadingText="Creating account..."
          >
            Create Account
          </ActionButton>
        </form>

        <div className="admin-login-footer">
          <p className="footer-text">
            Already have an account? 
            <Link to="/admin/login" className="register-link"> Login here</Link>
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px", fontStyle: "italic", textAlign: "center" }}>
            ℹ️ Test credentials are pre-filled for development purposes only
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
