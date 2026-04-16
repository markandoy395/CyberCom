import {
  API_BASE_URL,
  API_ENDPOINTS,
  PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE,
} from "../../../utils/api";

const TARGET_CAPTURE_INTERVAL_MS = 700;
const CAPTURE_RETRY_INTERVAL_MS = 250;
const CAPTURE_ERROR_INTERVAL_MS = 1000;
const MAX_CAPTURE_WIDTH = 1024;
const FRAME_IMAGE_QUALITY = 0.55;
const DISPLAY_CAPTURE_FRAME_RATE = { ideal: 10, max: 12 };
const listeners = new Set();
const COMPETITION_ACCESS_REVOKED_ERROR_CODE = "competition_access_revoked";

const initialState = {
  session: null,
  isStarting: false,
  isSharing: false,
  startedAt: null,
  lastFrameAt: null,
  error: "",
  displaySurface: null,
  sourceLabel: null,
};

let state = { ...initialState };
let activeStream = null;
let previewVideo = null;
let previewCanvas = null;
let captureTimer = null;
let frameInFlight = false;
let backendSessionStarted = false;
let startPromise = null;
let captureMimeType = null;
let isPageUnloading = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    isPageUnloading = true;
  });
  window.addEventListener("pagehide", () => {
    isPageUnloading = true;
  });
  window.addEventListener("pageshow", () => {
    isPageUnloading = false;
  });
}

const normalizeSession = (session) => {
  if (!session) {
    return null;
  }

  const memberId = Number.parseInt(session.memberId, 10);
  const teamId = Number.parseInt(session.teamId, 10);
  const competitionId = Number.parseInt(session.competitionId, 10);

  if (!Number.isFinite(memberId) || !Number.isFinite(teamId) || !Number.isFinite(competitionId)) {
    return null;
  }

  return {
    memberId,
    teamId,
    competitionId,
    sessionToken: session.sessionToken || "",
    username: session.username || "",
    teamName: session.teamName || "",
  };
};

const scaleFrame = (width, height) => {
  if (!width || !height) {
    return { width: 1280, height: 720 };
  }

  if (width <= MAX_CAPTURE_WIDTH) {
    return { width, height };
  }

  const ratio = MAX_CAPTURE_WIDTH / width;

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const getPreferredCaptureMimeType = () => {
  if (captureMimeType) {
    return captureMimeType;
  }

  const testCanvas = document.createElement("canvas");
  captureMimeType = testCanvas.toDataURL("image/webp", FRAME_IMAGE_QUALITY).startsWith("data:image/webp")
    ? "image/webp"
    : "image/jpeg";

  return captureMimeType;
};

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Unable to read the captured screen frame."));
  reader.readAsDataURL(blob);
});

const canvasToImageDataUrl = async (canvas, mimeType, quality) => {
  if (!canvas.toBlob) {
    return canvas.toDataURL(mimeType, quality);
  }

  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) {
    return canvas.toDataURL(mimeType, quality);
  }

  try {
    return await blobToDataUrl(blob);
  } catch {
    return canvas.toDataURL(mimeType, quality);
  }
};

const emit = () => {
  const nextState = CompetitionScreenShareManager.getState();

  listeners.forEach(listener => listener(nextState));
};
const emitAccessRevoked = message => {
  window.dispatchEvent(new CustomEvent("competition-access-revoked", {
    detail: { message },
  }));
};

const setState = patch => {
  state = {
    ...state,
    ...patch,
  };
  emit();
};

const buildHeaders = token => ({
  "Content-Type": "application/json",
  ...(token ? { "x-competition-token": token } : {}),
});

const requestJson = async (endpoint, options = {}) => {
  const {
    method = "POST",
    body = null,
    token = "",
    keepalive = false,
  } = options;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: buildHeaders(token),
    ...(body ? { body: JSON.stringify(body) } : {}),
    keepalive,
  });
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      response.status === 503
        ? PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE
        : (data.error || `HTTP ${response.status}`)
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const stopCaptureLoop = ({ disposePreviewVideo = false } = {}) => {
  if (captureTimer) {
    window.clearTimeout(captureTimer);
    captureTimer = null;
  }

  if (disposePreviewVideo && previewVideo) {
    previewVideo.pause?.();
    previewVideo.srcObject = null;
    previewVideo = null;
  }

  previewCanvas = null;
  frameInFlight = false;
};

const scheduleNextCapture = (delay = TARGET_CAPTURE_INTERVAL_MS) => {
  if (captureTimer) {
    window.clearTimeout(captureTimer);
  }

  if (!previewVideo || !backendSessionStarted) {
    captureTimer = null;
    return;
  }

  captureTimer = window.setTimeout(() => {
    captureTimer = null;
    void captureAndSchedule();
  }, delay);
};

const disposeLocalStream = ({ stopTracks = true } = {}) => {
  stopCaptureLoop({ disposePreviewVideo: true });

  if (activeStream && stopTracks) {
    activeStream.getTracks().forEach(track => track.stop());
  }

  activeStream = null;
};

const captureFrame = async () => {
  const session = state.session;

  if (!activeStream || !previewVideo || !previewCanvas || !backendSessionStarted || !session?.sessionToken) {
    return TARGET_CAPTURE_INTERVAL_MS;
  }

  if (frameInFlight || previewVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return CAPTURE_RETRY_INTERVAL_MS;
  }

  const captureStartedAt = performance.now();
  const width = previewVideo.videoWidth || 1280;
  const height = previewVideo.videoHeight || 720;
  const dimensions = scaleFrame(width, height);
  const context = previewCanvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });

  if (!context) {
    return CAPTURE_RETRY_INTERVAL_MS;
  }

  previewCanvas.width = dimensions.width;
  previewCanvas.height = dimensions.height;
  context.drawImage(previewVideo, 0, 0, dimensions.width, dimensions.height);

  frameInFlight = true;

  try {
    const mimeType = getPreferredCaptureMimeType();
    const imageDataUrl = await canvasToImageDataUrl(previewCanvas, mimeType, FRAME_IMAGE_QUALITY);
    const response = await requestJson(API_ENDPOINTS.COMPETITION_SCREEN_SHARE_FRAME, {
      token: session.sessionToken,
      body: {
        teamId: session.teamId,
        competitionId: session.competitionId,
        capturedAt: new Date().toISOString(),
        width: dimensions.width,
        height: dimensions.height,
        mimeType,
        displaySurface: state.displaySurface,
        sourceLabel: state.sourceLabel,
        imageDataUrl,
      },
    });

    setState({
      lastFrameAt: response?.data?.lastFrameAt || new Date().toISOString(),
      error: "",
    });

    return Math.max(
      0,
      TARGET_CAPTURE_INTERVAL_MS - Math.round(performance.now() - captureStartedAt)
    );
  } catch (error) {
    console.error("Unable to send the shared screen frame:", error);

    if (error?.data?.errorCode === COMPETITION_ACCESS_REVOKED_ERROR_CODE) {
      const revokedMessage = error.data?.error || error.message || "Your competition access was revoked.";

      emitAccessRevoked(revokedMessage);
      await CompetitionScreenShareManager.stopSharing({
        notifyServer: false,
        preserveSession: true,
        reason: "access-revoked",
        userMessage: revokedMessage,
      });

      return CAPTURE_ERROR_INTERVAL_MS;
    }

    setState({
      error: error.message || "Unable to send the shared full-screen preview.",
    });

    return CAPTURE_ERROR_INTERVAL_MS;
  } finally {
    frameInFlight = false;
  }
};

const captureAndSchedule = async () => {
  const nextDelay = await captureFrame();

  if (activeStream && previewVideo && backendSessionStarted) {
    scheduleNextCapture(nextDelay);
  }
};

const scheduleCapture = () => {
  stopCaptureLoop();

  if (!previewVideo) {
    return;
  }

  previewCanvas = document.createElement("canvas");
  scheduleNextCapture(0);
};

class CompetitionScreenShareManager {
  static getState() {
    const hasRequiredFullScreenShare = Boolean(state.isSharing && state.displaySurface === "monitor");

    return {
      ...state,
      hasRequiredFullScreenShare,
      isBlocked: Boolean(state.session && !state.isStarting && !hasRequiredFullScreenShare),
    };
  }

  static subscribe(listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  static setSession(session) {
    const normalizedSession = normalizeSession(session);

    if (!normalizedSession) {
      return;
    }

    setState({ session: normalizedSession });
  }

  static clearSession() {
    disposeLocalStream();
    backendSessionStarted = false;
    state = { ...initialState };
    emit();
  }

  static clearError() {
    setState({ error: "" });
  }

  static async stopSharing(options = {}) {
    const {
      notifyServer = true,
      keepalive = false,
      reason = "participant-stopped",
      preserveSession = true,
      userMessage = "",
      stopTracks = true,
    } = options;
    const session = state.session;
    const token = session?.sessionToken || "";
    const shouldNotifyServer = Boolean(notifyServer && backendSessionStarted && token);

    disposeLocalStream({ stopTracks });
    backendSessionStarted = false;

    if (shouldNotifyServer) {
      try {
        await requestJson(API_ENDPOINTS.COMPETITION_SCREEN_SHARE_STOP, {
          token,
          keepalive,
          body: { reason },
        });
      } catch (error) {
        console.warn("Unable to notify the server that screen sharing stopped:", error);
      }
    }

    setState({
      session: preserveSession ? session : null,
      isStarting: false,
      isSharing: false,
      startedAt: null,
      lastFrameAt: null,
      error: userMessage,
      displaySurface: null,
      sourceLabel: null,
    });

    return true;
  }

  static async handleRequiredShareLost(reason = "browser-share-ended") {
    if (isPageUnloading) {
      return this.stopSharing({
        notifyServer: false,
        preserveSession: true,
        stopTracks: false,
        reason: "page-refresh",
        userMessage: "",
      });
    }

    return this.stopSharing({
      notifyServer: true,
      preserveSession: true,
      stopTracks: false,
      reason,
      userMessage: "Full-screen sharing stopped. Resume it to continue using the competition system.",
    });
  }

  static async startRequiredShare(sessionOverride = null) {
    if (startPromise) {
      return startPromise;
    }

    const nextSession = normalizeSession(sessionOverride || state.session);

    if (!nextSession?.memberId || !nextSession?.teamId || !nextSession?.competitionId || !nextSession?.sessionToken) {
      setState({
        session: nextSession,
        isStarting: false,
        isSharing: false,
        error: "Competition session is not ready for full-screen sharing yet.",
      });

      return false;
    }

    if (this.getState().hasRequiredFullScreenShare && state.session?.memberId === nextSession.memberId) {
      setState({
        session: nextSession,
        error: "",
      });

      return true;
    }

    startPromise = (async () => {
      let stream = null;

      setState({
        session: nextSession,
        isStarting: true,
        error: "",
      });
      isPageUnloading = false;

      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("This browser does not support full-screen sharing.");
        }

        if (activeStream) {
          await this.stopSharing({
            notifyServer: true,
            preserveSession: true,
            reason: "restart-share",
          });
          setState({
            session: nextSession,
            isStarting: true,
            error: "",
          });
        }

        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            frameRate: DISPLAY_CAPTURE_FRAME_RATE,
            cursor: "always",
          },
          audio: false,
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          surfaceSwitching: "exclude",
          monitorTypeSurfaces: "include",
        });

        const [track] = stream.getVideoTracks();

        if (!track) {
          throw new Error("The browser did not provide a screen video track.");
        }

        const settings = track.getSettings?.() || {};
        const displaySurface = settings.displaySurface || null;
        const sourceLabel = track.label || "";

        if (displaySurface !== "monitor") {
          stream.getTracks().forEach(mediaTrack => mediaTrack.stop());

          const message = displaySurface
            ? "Choose your entire screen, not a browser tab or a single window."
            : "This browser cannot verify full-screen sharing. Use a Chromium-based browser and select Entire Screen.";

          setState({
            session: nextSession,
            isStarting: false,
            isSharing: false,
            startedAt: null,
            lastFrameAt: null,
            error: message,
            displaySurface,
            sourceLabel,
          });

          return false;
        }

        const video = document.createElement("video");

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => {});

        track.addEventListener("ended", () => {
          void this.handleRequiredShareLost("browser-share-ended");
        }, { once: true });

        const response = await requestJson(API_ENDPOINTS.COMPETITION_SCREEN_SHARE_START, {
          token: nextSession.sessionToken,
          body: {
            teamId: nextSession.teamId,
            competitionId: nextSession.competitionId,
            displaySurface,
            sourceLabel,
          },
        });

        activeStream = stream;
        previewVideo = video;
        backendSessionStarted = true;
        scheduleCapture();

        setState({
          session: nextSession,
          isStarting: false,
          isSharing: true,
          startedAt: response?.data?.screenShareStartedAt || new Date().toISOString(),
          lastFrameAt: response?.data?.lastScreenFrameAt || null,
          error: "",
          displaySurface,
          sourceLabel,
        });

        return true;
      } catch (error) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        setState({
          session: nextSession,
          isStarting: false,
          isSharing: false,
          startedAt: null,
          lastFrameAt: null,
          error: error?.name === "NotAllowedError"
            ? "Full-screen sharing is required. Choose Entire Screen to enter the competition."
            : (error.message || "Unable to start full-screen sharing."),
          displaySurface: null,
          sourceLabel: null,
        });

        return false;
      } finally {
        startPromise = null;
      }
    })();

    return startPromise;
  }
}

export default CompetitionScreenShareManager;
