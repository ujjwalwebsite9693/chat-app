import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ChatDashboard from "./pages/ChatDashboard.jsx";
import DeveloperPage from "./pages/DeveloperPage.jsx";

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

// The root route shows the app when logged in, or the marketing landing
// page when it's the first thing a visitor sees - no redirect either way.
function HomeRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <ChatDashboard /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/" element={<HomeRoute />} />
      <Route path="/developer" element={<DeveloperPage />} />
    </Routes>
  );
}
