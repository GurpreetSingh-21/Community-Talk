// src/App.jsx
import { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Home from './Home'
import Login from './Login'
import Registration from './Registration'
import Profile from './pages/Profile';
import Landing from './Landing';
import './css/global.css';
import './css/auth.css';
import './css/home.css';
import './css/responsive.css';

function App() {
  // track auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // on mount, check for token
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'))
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }
  const handleRegistration = () => {
    setIsAuthenticated(true)
  }
  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Landing page: always public */}
          <Route path="/" element={<Landing />} />

          {/* Login & Registration */}
          <Route
            path="/login"
            element={
              isAuthenticated
                ? <Navigate to="/home" replace />
                : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated
                ? <Navigate to="/home" replace />
                : <Registration onRegister={handleRegistration} />
            }
          />

          {/* Protected Home */}
          <Route
            path="/home"
            element={
              isAuthenticated
                ? <Home onLogout={handleLogout} />
                : <Navigate to="/login" replace />
            }
          />

          {/* Protected Profile */}
          <Route
            path="/profile"
            element={
              isAuthenticated
                ? <Profile onLogout={handleLogout} />
                : <Navigate to="/login" replace />
            }
          />

          {/* Catch-all: redirect unknown paths back to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App