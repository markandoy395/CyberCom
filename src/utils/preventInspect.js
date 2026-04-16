const isCompetitionRoute = () => {
  const { pathname } = window.location;

  return pathname.includes('/competition/dashboard') || pathname.includes('/competition/login');
};

export const preventInspect = () => {
  if (!import.meta.env.PROD) {
    return;
  }

  const syncCompetitionMode = () => {
    inCompetitionMode = isCompetitionRoute();
  };

  let inCompetitionMode = isCompetitionRoute();

  window.addEventListener('popstate', syncCompetitionMode);

  const originalPushState = window.history.pushState;
  window.history.pushState = function pushState(...args) {
    syncCompetitionMode();

    return originalPushState.apply(this, args);
  };

  document.addEventListener('contextmenu', e => {
    if (inCompetitionMode) {
      e.preventDefault();
    }
  });

  const keysPressed = new Set();

  document.addEventListener('keydown', e => {
    const isDashboard = window.location.pathname.includes('/competition/dashboard');
    if (!isDashboard) {
      return;
    }

    keysPressed.add(e.key.toLowerCase());
    keysPressed.add(e.code?.toLowerCase());

    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.key === 'l') ||
      (e.metaKey && e.key === 'l') ||
      e.key === 'Tab' ||
      (e.metaKey && e.key === 'Tab') ||
      ((keysPressed.has('meta') || keysPressed.has('win') || keysPressed.has('os')) && e.key === 'Tab')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('keyup', e => {
    keysPressed.delete(e.key.toLowerCase());
    keysPressed.delete(e.code?.toLowerCase());
  });
};
