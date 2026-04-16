import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PracticeRules from "../components/PracticeRules";
import NotificationModal from "../../../common/NotificationModal";
import { apiPost, API_ENDPOINTS } from "../../../utils/api";
import logo from "../../../assets/images/logo.png";
import "./Login.css";

const SIGN_IN_MODE = "signin";
const SIGN_UP_MODE = "signup";

const PracticeAuthPage = () => {
  const savedEmail = typeof window !== "undefined"
    ? (localStorage.getItem("rememberedEmail") || "")
    : "";
  const [mode, setMode] = useState(SIGN_IN_MODE);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    typeof window !== "undefined" && !!localStorage.getItem("rememberedEmail")
  );
  const [showRules, setShowRules] = useState(false);

  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const MIN_SUBMIT_DELAY = 500;

  const { login } = useAuth();
  const navigate = useNavigate();
  const isSignUpMode = mode === SIGN_UP_MODE;

  const resetThrottle = () => {
    isSubmittingRef.current = false;
  };

  const showError = message => {
    setNotification({
      type: 'error',
      title: 'Error',
      message,
    });
  };

  const persistRememberedEmail = () => {
    if (rememberMe && email) {
      localStorage.setItem("rememberedEmail", email);
      return;
    }

    localStorage.removeItem("rememberedEmail");
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const now = Date.now();
    if (isSubmittingRef.current) {
      return;
    }
    if (now - lastSubmitTimeRef.current < MIN_SUBMIT_DELAY) {
      return;
    }

    if (!checkboxChecked) {
      showError("Please agree to the practice rules before continuing");
      return;
    }

    if (!email || !password || (isSignUpMode && !username)) {
      showError("Please complete all required fields");
      return;
    }

    if (isSignUpMode && password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;

    try {
      const response = isSignUpMode
        ? await apiPost(API_ENDPOINTS.AUTH_REGISTER_PRACTICE, {
          username,
          email,
          password,
        })
        : await apiPost(API_ENDPOINTS.AUTH_LOGIN_PRACTICE, {
          identity: email,
          password,
        });

      if (!response.success || !response.user) {
        showError(response.error || "Practice authentication failed");
        resetThrottle();
        return;
      }

      persistRememberedEmail();
      localStorage.setItem("userSession", JSON.stringify({
        practice_user_id: response.user.id,
        user_id: response.user.id,
        account_type: "practice_user",
      }));
      login({
        ...response.user,
        token: response.token || null,
      });
      navigate("/");
    } catch (error) {
      showError(error?.data?.error || error.message || "Practice authentication failed");
      resetThrottle();
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
            <p className="login-subtitle">
              {isSignUpMode ? "Create your practice account" : "Sign in to your practice account"}
            </p>
          </div>

          <NotificationModal
            notification={notification}
            onDismiss={handleDismissNotification}
            duration={3000}
          />

          <div className="login-mode-toggle" role="tablist" aria-label="Practice auth mode">
            <button
              type="button"
              className={`login-mode-btn ${!isSignUpMode ? "active" : ""}`}
              onClick={() => setMode(SIGN_IN_MODE)}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-mode-btn ${isSignUpMode ? "active" : ""}`}
              onClick={() => setMode(SIGN_UP_MODE)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {isSignUpMode && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="input"
                placeholder={isSignUpMode ? "Create a password" : "Enter your password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {isSignUpMode && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <div className="remember-me-section">
              <div className="remember-me-checkbox-wrapper">
                <input
                  type="checkbox"
                  id="rememberCheckbox"
                  className="remember-checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
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
                  onChange={e => setCheckboxChecked(e.target.checked)}
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
              {isSignUpMode ? "Create Practice Account" : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <p className="text-muted">
              {isSignUpMode
                ? "New accounts are saved to the practice users database."
                : "Use your registered practice account to continue."}
            </p>
            <p className="text-muted">
              {isSignUpMode
                ? "After sign up, your account will appear in the admin practice users table."
                : "Need an account? Switch to Sign Up above."}
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

export default PracticeAuthPage;
