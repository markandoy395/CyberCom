import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CompetitionRules from "../components/info/CompetitionRules";
import CompetitionEndedLoginModal from "../components/modals/CompetitionEndedLoginModal";
import NotificationModal from "../../../common/NotificationModal";
import { apiPost, API_ENDPOINTS } from "../../../utils/api";
import DeviceFingerprintGenerator from "../../../utils/DeviceFingerprinter";
import { useCompetitionScreenShare } from "../live-monitor";
import CompetitionScreenShareManager from "../live-monitor/CompetitionScreenShareManager";
import "./CompetitionLogin.css";

const MIN_SUBMIT_DELAY = 500;

const normalizeCompetitionLoginError = error => (
  error?.message || "Connection error. Please try again."
).replace(/^API Error \[\d+\] [^:]+: /, "");

const buildCompetitionSession = responseData => ({
  memberId: responseData.memberId,
  username: responseData.username,
  email: responseData.email,
  role: responseData.role,
  teamId: responseData.teamId,
  teamName: responseData.teamName,
  competitionId: responseData.competitionId,
  competitionStatus: responseData.competitionStatus || null,
  status: responseData.status || "online",
  sessionToken: responseData.sessionToken,
  startTime: new Date().toISOString(),
  isActive: true,
});

const CompetitionLogin = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [_rulesAgreed, _setRulesAgreed] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [showCompetitionEndedModal, setShowCompetitionEndedModal] = useState(false);
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isStarting: isStartingRequiredShare,
    startRequiredShare,
    clearSession,
  } = useCompetitionScreenShare();

  const resetSubmitState = () => {
    setLoading(false);
    _setRulesAgreed(false);
    isSubmittingRef.current = false;
  };

  const handleChange = event => {
    setCredentials(current => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const rollbackCompetitionLogin = async competitionSession => {
    try {
      await apiPost(API_ENDPOINTS.AUTH_LOGOUT_COMPETITION, {
        memberId: competitionSession.memberId,
        sessionToken: competitionSession.sessionToken,
      });
    } catch (error) {
      console.warn("Unable to rollback competition login after share failure:", error);
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const now = Date.now();

    if (isSubmittingRef.current || now - lastSubmitTimeRef.current < MIN_SUBMIT_DELAY) {
      return;
    }

    if (!checkboxChecked) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: "You must agree to the competition rules to proceed.",
      });

      return;
    }

    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    _setRulesAgreed(true);
    setLoading(true);
    setNotification(null);

    try {
      const deviceInfo = await DeviceFingerprintGenerator.collectDeviceInfo();
      const response = await apiPost(API_ENDPOINTS.AUTH_LOGIN_COMPETITION, {
        username: credentials.username,
        password: credentials.password,
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          persistentId: deviceInfo.persistentId,
          deviceFingerprint: deviceInfo.deviceFingerprint,
          canvasFingerprint: deviceInfo.canvasFingerprint,
          screenResolution: deviceInfo.screenResolution,
          platform: deviceInfo.platform,
          timezone: deviceInfo.timezone,
          macAddress: deviceInfo.macAddress,
        },
      });

      if (!response.success) {
        if (response.error?.includes("This competition has ended")) {
          setShowCompetitionEndedModal(true);
        } else {
          setNotification({
            type: 'error',
            title: 'Error',
            message: response.error || "Invalid credentials. Please check your username and password.",
          });
        }

        resetSubmitState();
        return;
      }

      const competitionSession = buildCompetitionSession(response.data);
      const shareGranted = await startRequiredShare(competitionSession);

      if (!shareGranted) {
        await rollbackCompetitionLogin(competitionSession);
        clearSession();

        setNotification({
          type: 'error',
          title: 'Error',
          message:
            CompetitionScreenShareManager.getState().error
            || "Full-screen sharing is required. Choose Entire Screen to enter the competition.",
        });
        resetSubmitState();
        return;
      }

      localStorage.setItem("competitionSession", JSON.stringify(competitionSession));
      navigate("/competition/dashboard", { replace: true });
      return;
    } catch (error) {
      const normalizedError = normalizeCompetitionLoginError(error);

      if (normalizedError.includes("This competition has ended")) {
        setShowCompetitionEndedModal(true);
      } else {
        setNotification({
          type: 'error',
          title: 'Error',
          message: normalizedError,
        });
      }

      clearSession();
      resetSubmitState();
      return;
    }

    resetSubmitState();
  };

  const handleRulesAgree = () => {
    setShowRules(false);
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleCompetitionEndedClose = () => {
    setShowCompetitionEndedModal(false);
    setCredentials({ username: "", password: "" });
    setCheckboxChecked(false);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  useEffect(() => {
    const logoutMessage = location.state?.logoutMessage;

    if (!logoutMessage) {
      return;
    }

    setNotification({
      type: 'error',
      title: 'Error',
      message: logoutMessage,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="competition-login-page">
      {showCompetitionEndedModal && (
        <CompetitionEndedLoginModal
          competitionName="Current Competition"
          onClose={handleCompetitionEndedClose}
          onGoHome={handleGoHome}
        />
      )}

      {showRules && (
        <CompetitionRules
          isModal={true}
          onAgree={handleRulesAgree}
        />
      )}

      <div className="competition-login-container">
        <div className="competition-login-card">
          <div className="competition-login-header">
            <h1 className="competition-title">Competition</h1>
            <p className="competition-subtitle">Enter your credentials</p>
          </div>

          <NotificationModal
            notification={notification}
            onDismiss={() => setNotification(null)}
            duration={5000}
          />

          <form onSubmit={handleSubmit} className="competition-login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="input"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="input"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="competition-note">
              <p>Credentials are provided by the admin before the competition starts.</p>
              <p className="competition-note-strong">
                Entire-screen sharing is required before you can enter the competition.
              </p>
            </div>

            <div className="rules-agreement-section">
              <div className="rules-checkbox-wrapper">
                <input
                  type="checkbox"
                  id="rulesCheckbox"
                  className="rules-checkbox"
                  checked={checkboxChecked}
                  onChange={event => setCheckboxChecked(event.target.checked)}
                />
                <label htmlFor="rulesCheckbox" className="rules-checkbox-label">
                  I agree to the competition rules
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

            <div className="competition-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !checkboxChecked}
              >
                {loading
                  ? (isStartingRequiredShare ? "Share Entire Screen..." : "Validating...")
                  : "Enter Competition"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompetitionLogin;
