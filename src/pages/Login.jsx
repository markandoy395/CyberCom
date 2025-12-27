import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mock login - replace with actual API call
    if (email && password) {
      const mockUser = {
        id: 1,
        name: "John Doe",
        email: email,
        avatar: null,
        role: email === "admin@ctf.com" ? "admin" : "user",
      };

      login(mockUser);
      navigate("/");
    } else {
      setError("Please enter both email and password");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">🛡️</div>
            <h1 className="login-title">CTF Platform</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-message">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign In
            </button>
          </form>

          <div className="login-footer">
            <p className="text-muted">
              Demo credentials: Use any email and password
            </p>
            <p className="text-muted">For admin access: admin@ctf.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
