import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PracticeRules from "../components/PracticeRules";
import NotificationModal from "../../../common/NotificationModal";
import logo from "../../../assets/images/logo.png";
import "./Login.css";

const Login = () => {
  // Test credentials (auto-filled for testing only)
  const TEST_EMAIL = "user@example.com";
  const TEST_PASSWORD = "password123";

  const savedEmail = typeof window !== 'undefined' ? (localStorage.getItem("rememberedEmail") || TEST_EMAIL) : TEST_EMAIL;
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [notification, setNotification] = useState(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [rememberMe, setRememberMe] = useState(typeof window !== 'undefined' && !!localStorage.getItem("rememberedEmail"));
  const [showRules, setShowRules] = useState(false);
  
  // Prevent multiple rapid submissions
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const MIN_SUBMIT_DELAY = 500; // Minimum 500ms between submissions
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prevent multiple rapid submissions
    const now = Date.now();
    if (isSubmittingRef.current) {
      return;
    }
    if (now - lastSubmitTimeRef.current < MIN_SUBMIT_DELAY) {
      return;
    }

    if (!checkboxChecked) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: "Please agree to the practice rules before continuing"
      });
      return;
    }

    // Mark submission as in progress
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;

    // Mock login - replace with actual API call
    if (email && password) {
      const mockUser = {
        id: 1,
        name: "John Doe",
        email: email,
        avatar: null,
        role: email === "admin@ctf.com" ? "admin" : "user",
      };

      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      login(mockUser);
      navigate("/");
    } else {
      setNotification({
        type: 'error',
        title: 'Error',
        message: "Please enter both email and password"
      });
      isSubmittingRef.current = false;
    }
  };

  // Stable callback for dismissing notifications
  const handleDismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src={logo} alt="CyberCom Logo" className="login-logo-image" />
            <h1 className="login-title">CyberCom</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          {/* Global Result Alert */}
          <NotificationModal
            notification={notification}
            onDismiss={handleDismissNotification}
            duration={3000}
          />

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

            <div className="remember-me-section">
              <div className="remember-me-checkbox-wrapper">
                <input
                  type="checkbox"
                  id="rememberCheckbox"
                  className="remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberCheckbox" className="remember-checkbox-label">
                  Remember me
                </label>
              </div>
            </div>

            <div className="rules-agreement-section">
              <div className="rules-checkbox-wrapper">
                <input
                  type="checkbox"
                  id="rulesCheckbox"
                  className="rules-checkbox"
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />
                <label htmlFor="rulesCheckbox" className="rules-checkbox-label">
                  I agree to the practice rules and guidelines
                </label>
                <button
                  type="button"
                  className="rules-link"
                  onClick={() => setShowRules(true)}
                >
                  View Rules
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block btn-lg"
              disabled={!checkboxChecked}
            >
              Sign In
            </button>
          </form>

          <div className="login-footer">
            <p className="text-muted">
              Demo credentials: Use any email and password
            </p>
            <p className="text-muted">For admin access: admin@ctf.com</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px", fontStyle: "italic" }}>
              ℹ️ Test credentials are pre-filled for development purposes only
            </p>
          </div>
        </div>
      </div>

      {showRules && (
        <PracticeRules 
          isModal={true} 
          onAgree={() => setShowRules(false)}
        />
      )}
    </div>
  );
};

export default Login;
