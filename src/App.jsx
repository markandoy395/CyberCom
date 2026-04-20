import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./modules/practice/layout/Layout";
import Practice from "./modules/practice/pages/Practice";
import PracticeLogin from "./modules/practice/pages/PracticeAuthPage";
import { Leaderboard } from "./modules/practice/pages/leaderboard/Leaderboard";
import { Profile } from "./modules/practice/pages/profile/Profile";
import ChallengeDetail from "./modules/practice/pages/ChallengeDetail";
import { Settings } from "./modules/practice/pages/Settings";
import { Statistics } from "./modules/practice/pages/Statistics";
import { HelpSupport } from "./modules/practice/pages/HelpSupport";
import { Admin } from "./modules/admin/pages/Admin";
import AdminLogin from "./modules/admin/pages/AdminLogin";
import AdminRegister from "./modules/admin/pages/AdminRegister";
import CompetitionLogin from "./modules/competition/pages/CompetitionLogin";
import CompetitionDashboard from "./modules/competition/pages/CompetitionDashboard";
import DatabaseStatusBanner from "./common/DatabaseStatusBanner";
import { clearAdminAuth, hasValidAdminSession } from "./utils/api";

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Protected Route
const AdminProtectedRoute = ({ children }) => {
  if (!hasValidAdminSession()) {
    clearAdminAuth();
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const CompetitionProtectedRoute = ({ children }) => {
  const competitionSession = localStorage.getItem("competitionSession");

  if (!competitionSession) {
    return <Navigate to="/competition/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <DatabaseStatusBanner />
      <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <Admin />
              </AdminProtectedRoute>
            }
          />

          {/* Competition Routes */}
          <Route
            path="/competition"
            element={<Navigate to="/competition/login" replace />}
          />
          <Route path="/competition/login" element={<CompetitionLogin />} />
          <Route
            path="/competition/dashboard"
            element={(
              <CompetitionProtectedRoute>
                <CompetitionDashboard />
              </CompetitionProtectedRoute>
            )}
          />
          <Route
            path="/competition/*"
            element={<Navigate to="/competition/login" replace />}
          />

          {/* Practice Login */}
          <Route path="/login" element={<PracticeLogin />} />

          {/* Main App Routes with Layout */}
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Practice />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<Leaderboard />} />

            {/* Challenge Detail Route */}
            <Route
              path="/challenge/:id"
              element={
                <ProtectedRoute>
                  <ChallengeDetail />
                </ProtectedRoute>
              }
            />
            {/* Redirect /admin to dashboard or login */}
            <Route
              path="/admin"
              element={
                <Navigate
                  to={
                    hasValidAdminSession()
                      ? "/admin/dashboard"
                      : "/admin/login"
                  }
                  replace
                />
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/statistics"
              element={
                <ProtectedRoute>
                  <Statistics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/help"
              element={<HelpSupport />}
            />
          </Route>
        </Routes>
      </ThemeProvider>
    );
  }

  export default App;
