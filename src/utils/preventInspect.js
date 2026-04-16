let isCompetitionInspectAllowed = false;
const PREVENT_INSPECT_INITIALIZED_KEY = "__cybercomPreventInspectInitialized";

const isCompetitionRoute = () => {
  const { pathname } = window.location;

  return pathname.includes('/competition/dashboard') || pathname.includes('/competition/login');
};

const shouldBlockCompetitionInspect = () => isCompetitionRoute() && !isCompetitionInspectAllowed;

export const setCompetitionInspectAllowed = (allowed) => {
  isCompetitionInspectAllowed = Boolean(allowed);
};

export const preventInspect = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (window[PREVENT_INSPECT_INITIALIZED_KEY]) {
    return;
  }

  window[PREVENT_INSPECT_INITIALIZED_KEY] = true;

  document.addEventListener('contextmenu', e => {
    if (shouldBlockCompetitionInspect()) {
      e.preventDefault();
    }
  }, true);

  const keysPressed = new Set();

  document.addEventListener('keydown', e => {
    if (!shouldBlockCompetitionInspect()) {
      return;
    }

    const normalizedKey = String(e.key || "").toLowerCase();
    keysPressed.add(normalizedKey);
    keysPressed.add(e.code?.toLowerCase());

    if (
      normalizedKey === 'f12' ||
      (e.ctrlKey && e.shiftKey && normalizedKey === 'i') ||
      (e.ctrlKey && e.shiftKey && normalizedKey === 'c') ||
      (e.ctrlKey && e.shiftKey && normalizedKey === 'j') ||
      (e.ctrlKey && normalizedKey === 'l') ||
      (e.metaKey && normalizedKey === 'l') ||
      normalizedKey === 'tab' ||
      (e.metaKey && normalizedKey === 'tab') ||
      ((keysPressed.has('meta') || keysPressed.has('win') || keysPressed.has('os')) && normalizedKey === 'tab')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('keyup', e => {
    keysPressed.delete(String(e.key || "").toLowerCase());
    keysPressed.delete(e.code?.toLowerCase());
  });
};
