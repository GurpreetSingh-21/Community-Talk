import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import "./Profile.css"; 

function Profile({ onLogout }) {
  const [user, setUser] = useState({ name: "", email: "" });
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem("profileImage") || "/default-avatar.png";
  });
  

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setUser({
        name: decoded.fullName || "User",
        email: decoded.email || "unknown@example.com",
      });
    }
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const handleChange = (e) => {
    setUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    // In real app: send PUT request to backend
    localStorage.setItem("updatedUser", JSON.stringify(user));
    setEditMode(false);
    alert("Changes saved (locally)");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
      <div className="profile-avatar">
  <label htmlFor="avatar-upload">
    <img src={profileImage} alt="Avatar" />
  </label>
  <input
    type="file"
    id="avatar-upload"
    accept="image/*"
    style={{ display: "none" }}
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            setProfileImage(reader.result);
            localStorage.setItem("profileImage", reader.result); 
          };
          
        reader.readAsDataURL(file);
      }
    }}
  />
</div>


        {editMode ? (
          <>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              className="profile-input"
            />
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChange}
              className="profile-input"
            />
            <button className="save-btn" onClick={handleSave}>Save</button>
            <button className="cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
          </>
        ) : (
          <>
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-email">{user.email}</p>
            <button className="edit-btn" onClick={() => setEditMode(true)}>Edit Info</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
