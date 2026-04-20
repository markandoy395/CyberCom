import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import CompetitionLogin from "./modules/competition/pages/CompetitionLogin";
import CompetitionDashboard from "./modules/competition/pages/CompetitionDashboard";
import DatabaseStatusBanner from "./common/DatabaseStatusBanner";

const CompetitionProtectedRoute = ({ children }) => {
  const competitionSession = localStorage.getItem("competitionSession");

  if (!competitionSession) {
    return <Navigate to="/competition/login" replace />;
  }

  return children;
};

function CompetitionApp() {
  return (
    <ThemeProvider>
      <DatabaseStatusBanner />
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/competition/login" replace />}
        />
        <Route
          path="/competition"
          element={<Navigate to="/competition/login" replace />}
        />
        <Route path="/competition/login" element={<CompetitionLogin />} />
        <Route
          path="/competition/dashboard"
          element={
            <CompetitionProtectedRoute>
              <CompetitionDashboard />
            </CompetitionProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/competition/login" replace />}
        />
      </Routes>
    </ThemeProvider>
  );
}

export default CompetitionApp;
