// src/pages/Landing.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "/hero.jpeg";
import { motion } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="landing">
      <header className={`landing__header ${scrolled ? "header-scrolled" : ""}`}>
        <div className="landing__logo">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="logo-container"
          >
            <span className="logo-text">Community</span>
            <span className="logo-highlight">Talk</span>
          </motion.div>
        </div>
        <motion.nav 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="landing__nav"
        >
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#contact" className="nav-link">Contact</a>
          <button 
            className="btn btn--secondary" 
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
          <button
            className="btn btn--primary"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </motion.nav>
        <div className="menu-toggle">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </header>

      <section className="landing__hero">
        <motion.div 
          className="landing__hero-text"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.h1 variants={fadeIn}>Connect with your community</motion.h1>
          <motion.p variants={fadeIn}>
            Simple, reliable, private messaging and calling for free, available
            all over the world. Join thousands of communities already using CommunityTalk.
          </motion.p>
          <motion.div className="cta-buttons" variants={fadeIn}>
            <button
              className="btn btn--primary"
              onClick={() => navigate("/register")}
            >
              Get Started
            </button>
            <button
              className="btn btn--outline"
              onClick={() => navigate("/login")}
            >
              Log In
            </button>
          </motion.div>
          <motion.div className="hero-stats" variants={fadeIn}>
            <div className="stat-item">
              <span className="stat-number">10M+</span>
              <span className="stat-label">Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">150+</span>
              <span className="stat-label">Countries</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </motion.div>
        </motion.div>
        <motion.div 
          className="landing__hero-image"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="image-container">
            <img src={heroImg} alt="Community Talk hero graphic" className="hero-image" />
            <div className="floating-elements">
              <div className="floating-badge badge-1">End-to-end encryption</div>
              <div className="floating-badge badge-2">Group chats</div>
              <div className="floating-badge badge-3">Video calls</div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="features-section" id="features">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="section-title"
        >
          Why Choose CommunityTalk?
        </motion.h2>
        <div className="features-grid">
          {[
            {
              icon: "🔒",
              title: "Secure & Private",
              desc: "End-to-end encryption to keep your messages private."
            },
            {
              icon: "🌐",
              title: "Available Everywhere",
              desc: "Access from any device, anywhere in the world."
            },
            {
              icon: "👥",
              title: "Community Focused",
              desc: "Build and nurture communities with powerful group features."
            },
            {
              icon: "⚡",
              title: "Lightning Fast",
              desc: "Optimized performance for quick messaging."
            }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="landing__footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-text">Community</span>
            <span className="logo-highlight">Talk</span>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Security</a>
              <a href="#">Pricing</a>
              <a href="#">FAQ</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CommunityTalk. All rights reserved.</p>
          <div className="social-icons">
            <a href="#" className="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a href="#" className="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </a>
            <a href="#" className="social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* —————— PAGE‐LOCAL STYLES —————— */}
      <style>{`
        .landing {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #333;
          overflow-x: hidden;
        }

        /* Header Styles */
        .landing__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.2rem 5%;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .header-scrolled {
          padding: 0.8rem 5%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .landing__logo {
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
        }

        .logo-text {
          font-weight: 500;
        }

        .logo-highlight {
          font-weight: 700;
          color: #4f46e5;
          margin-left: 4px;
        }

        .landing__nav {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-link {
          color: #666;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
          position: relative;
        }

        .nav-link:hover {
          color: #4f46e5;
        }

        .nav-link:after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -4px;
          left: 0;
          background-color: #4f46e5;
          transition: width 0.3s ease;
        }

        .nav-link:hover:after {
          width: 100%;
        }

        .menu-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
        }

        .menu-toggle span {
          display: block;
          width: 25px;
          height: 3px;
          background-color: #333;
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        /* Button Styles */
        .btn {
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.3s ease;
          padding: 0.7rem 1.5rem;
          cursor: pointer;
          font-size: 0.95rem;
          border: none;
        }

        .btn--primary {
          background: linear-gradient(135deg, #4f46e5 0%, #635bff 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(79, 70, 229, 0.4);
        }

        .btn--secondary {
          background: transparent;
          color: #4f46e5;
        }

        .btn--secondary:hover {
          background: rgba(79, 70, 229, 0.1);
        }

        .btn--outline {
          background: transparent;
          border: 2px solid #4f46e5;
          color: #4f46e5;
        }

        .btn--outline:hover {
          background: rgba(79, 70, 229, 0.1);
          transform: translateY(-2px);
        }

        /* Hero Section */
        .landing__hero {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          padding: 6rem 5%;
          background: linear-gradient(135deg, #f8f9ff 0%, #f1f3ff 100%);
          position: relative;
          overflow: hidden;
        }

        .landing__hero:before {
          content: '';
          position: absolute;
          width: 50%;
          height: 80%;
          right: -15%;
          top: -30%;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
          border-radius: 50%;
          z-index: 1;
        }

        .landing__hero-text {
          flex: 1 1 500px;
          max-width: 650px;
          padding-right: 5%;
          position: relative;
          z-index: 2;
        }

        .landing__hero-text h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #333 0%, #4f46e5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .landing__hero-text p {
          font-size: 1.25rem;
          margin-bottom: 2.5rem;
          color: #555;
          line-height: 1.6;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .hero-stats {
          display: flex;
          gap: 2.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 700;
          color: #4f46e5;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
        }

        .landing__hero-image {
          flex: 1 1 400px;
          position: relative;
        }

        .image-container {
          position: relative;
          padding: 10px;
        }

        .hero-image {
          width: 100%;
          height: auto;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          transform: perspective(1000px) rotateY(-5deg);
          transition: all 0.5s ease;
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .floating-badge {
          position: absolute;
          padding: 8px 15px;
          background: white;
          border-radius: 30px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          font-size: 0.875rem;
          font-weight: 600;
          color: #4f46e5;
        }

        .badge-1 {
          top: 10%;
          right: -5%;
          animation: float 3s ease-in-out infinite;
        }

        .badge-2 {
          top: 40%;
          left: -10%;
          animation: float 3.5s ease-in-out infinite 0.5s;
        }

        .badge-3 {
          bottom: 15%;
          right: 10%;
          animation: float 4s ease-in-out infinite 1s;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        /* Features Section */
        .features-section {
          padding: 6rem 5%;
          background: #fff;
          text-align: center;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 3rem;
          color: #333;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          background: #fff;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
        }

        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #333;
        }

        .feature-card p {
          color: #666;
          line-height: 1.6;
        }

        /* Footer */
        .landing__footer {
          background: #191a33;
          color: #fff;
          padding: 4rem 5% 2rem;
        }

        .footer-content {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          margin-bottom: 3rem;
        }

        .footer-logo {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 3rem;
        }

        .footer-column {
          min-width: 150px;
        }

        .footer-column h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #fff;
        }

        .footer-column a {
          display: block;
          color: #b4b4d0;
          text-decoration: none;
          margin-bottom: 0.75rem;
          transition: color 0.2s ease;
        }

        .footer-column a:hover {
          color: #4f46e5;
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.9rem;
        }

        .social-icons {
          display: flex;
          gap: 1rem;
        }

        .social-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transition: all 0.3s ease;
        }

        .social-icon:hover {
          background: #4f46e5;
          transform: translateY(-3px);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .landing__hero {
            padding: 5rem 5%;
          }
          
          .landing__hero-text h1 {
            font-size: 3rem;
          }
        }

        @media (max-width: 768px) {
          .landing__nav {
            display: none;
          }
          
          .menu-toggle {
            display: flex;
          }
          
          .landing__hero {
            flex-direction: column;
            padding: 4rem 5% 5rem;
          }
          
          .landing__hero-text {
            padding-right: 0;
            text-align: center;
            margin-bottom: 3rem;
          }
          
          .cta-buttons {
            justify-content: center;
          }
          
          .hero-stats {
            justify-content: center;
          }
          
          .footer-content {
            flex-direction: column;
            gap: 2rem;
          }
          
          .footer-bottom {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .landing__hero-text h1 {
            font-size: 2.5rem;
          }
          
          .cta-buttons {
            flex-direction: column;
            gap: 1rem;
          }
          
          .hero-stats {
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}