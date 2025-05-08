import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Registration({ onRegister }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const { confirmPassword, ...payload } = formData;

    try {
      await axios.post('http://localhost:3000/register', payload);
      alert("Registration successful!");
      if (onRegister) onRegister();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="auth-container">
      {/* ✅ Reused Login Navbar */}
      <header className={`login-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="login-logo" onClick={() => navigate("/")}>
          <span className="logo-text">Community</span>
          <span className="logo-highlight">Talk</span>
        </div>
        <nav className="login-nav">
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/login">Login</Link>
        </nav>
      </header>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Community Talk</h1>
          <p>Create a new account to get started.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text" id="fullName" name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? 'error' : ''}
            />
            {errors.fullName && <p className="error-message">{errors.fullName}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email" id="email" name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password" id="password" name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password" id="confirmPassword" name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" className="auth-button">Create Account</button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to="/login" className="auth-link"> Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Registration;