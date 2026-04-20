const normalizeOrigin = (value, fallback) => (
  (value || fallback).trim().replace(/\/+$/, "")
);

const buildUrl = (origin, path = "/") => {
  return new URL(path, `${origin}/`).toString();
};

const getRuntimeOrigin = fallbackOrigin => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeOrigin(window.location.origin, fallbackOrigin);
  }

  return normalizeOrigin(fallbackOrigin, "http://localhost:5174");
};

export const MAIN_APP_URL = getRuntimeOrigin(
  import.meta.env.VITE_MAIN_APP_URL || "http://localhost:5174"
);

// Competition routes are served by the same frontend origin as the main app.
export const COMPETITION_APP_URL = MAIN_APP_URL;

export const getMainAppUrl = path => buildUrl(MAIN_APP_URL, path);

export const getCompetitionAppUrl = path => buildUrl(
  COMPETITION_APP_URL,
  path
);
