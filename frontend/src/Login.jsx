
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';


function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const res = await axios.post('http://localhost:3000/login', formData);
      const token = res.data.token;
      localStorage.setItem('token', token);
      alert("Login successful!");
      if (onLogin) onLogin(token);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="auth-container">
      <header className={`login-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="login-logo" onClick={() => navigate("/")}>
          <span className="logo-text">Community</span>
          <span className="logo-highlight">Talk</span>
        </div>
        <nav className="login-nav">
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/register">Register</Link>
        </nav>
      </header>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Community Talk</h1>
          <p>Welcome back! Please log in to continue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email" id="email" name="email"
              value={formData.email} onChange={handleChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password" id="password" name="password"
              value={formData.password} onChange={handleChange}
              placeholder="Enter your password"
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me</label>
            </div>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="auth-button">Log In</button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;