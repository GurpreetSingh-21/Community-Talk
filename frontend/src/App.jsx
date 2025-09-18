// src/App.jsx
import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./Home";
import Login from "./Login";
import Registration from "./Registration";
import Profile from "./pages/Profile";
import Landing from "./Landing";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for JWT token on mount
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("token"));
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  const handleRegistration = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Registration onRegister={handleRegistration} />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Profile onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;