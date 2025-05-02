import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import DeleteModal from "./components/DeleteModal";
import { io } from "socket.io-client";
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from "react-router-dom";


function Home({ onLogout }) {
  const [userName, setUserName] = useState("");
  const [communities, setCommunities] = useState([]);
  const [currentCommunity, setCurrentCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(window.innerWidth > 1024);
  const [isSwitchingCommunity, setIsSwitchingCommunity] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setUserName(decoded.fullName || decoded.username || decoded.email || "User");
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setShowMembers(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/api/communities", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const fixed = res.data.map(c => ({
          id: c._id || c.id,
          name: c.name || "Untitled",
          active: false
        }));

        setCommunities(fixed);
        if (fixed.length > 0) selectCommunity(fixed[0]);
      } catch (err) {
        console.error("Error fetching communities:", err);
      }
    };
    fetchCommunities();
  }, []);

  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    newSocket.on("receive_message", (data) => {
      if (data.communityId === currentCommunity?.id) {
        setMessages((prev) => [...prev, data]);

        setTimeout(() => {
          document.querySelector(".messages-container")?.scrollTo(0, 9999);
        }, 50);
      }
    });

    return () => newSocket.disconnect();
  }, [currentCommunity]);

  const selectCommunity = async (community) => {
    if (!community?.id || isSwitchingCommunity) return;
    setIsSwitchingCommunity(true);

    setCurrentCommunity(community);
    setCommunities(prev =>
      prev.map(c => ({ ...c, active: c.id === community.id }))
    );

    try {
      const token = localStorage.getItem("token");

      const [messagesRes, membersRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/messages/${community.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:3000/api/members/${community.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMessages(messagesRes.data);
      setMembers(membersRes.data);

      setTimeout(() => {
        document.querySelector(".messages-container")?.scrollTo(0, 9999);
      }, 50);
    } catch (err) {
      console.error("Error loading community data:", err);
      setMessages([]);
      setMembers([]);
    } finally {
      setIsSwitchingCommunity(false);
    }
  };
  const [profileImage, setProfileImage] = useState(localStorage.getItem("profileImage") || "/default-avatar.png");

  useEffect(() => {
    const handleStorageChange = () => {
      setProfileImage(localStorage.getItem("profileImage") || "/default-avatar.png");
    };
  
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  const handleNewCommunity = async () => {
    const name = prompt("Enter community name:");
    if (!name) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:3000/api/communities",
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newC = {
        id: res.data._id,
        name: res.data.name,
        active: true
      };

      setCommunities(prev => prev.map(c => ({ ...c, active: false })).concat(newC));
      setCurrentCommunity(newC);
      setMessages([]);
      setMembers([]);
    } catch (err) {
      console.error("Error creating community:", err);
      alert(err.response?.data?.error || "Something went wrong");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentCommunity?.id) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3000/api/messages",
        {
          sender:  userName,
          content: newMessage,
          communityId: currentCommunity.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage(""); // message will appear via socket
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleDeleteCommunity = async (communityId) => {
    if (!window.confirm("Are you sure you want to delete this community?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/communities/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updated = communities.filter(c => c.id !== communityId);
      setCommunities(updated);

      if (currentCommunity?.id === communityId) {
        setCurrentCommunity(updated[0] || null);
        setMessages([]);
        setMembers([]);
      }

      alert("Community deleted successfully!");
    } catch (err) {
      console.error("Error deleting community:", err);
    }
  };

  return (
    <div className="home-container">
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <button className="hamburger-btn" onClick={() => setShowSidebar(!showSidebar)}>☰</button>
          Community Talk
        </div>
        <div className="search-container">
          <input type="text" className="search-input" placeholder="Search communities..." />
        </div>
        <div className="user-controls">
          <button className="notification-btn">🔔</button>
          <div className="user-avatar" onClick={() => navigate("/profile")}>
  <img src={profileImage} alt="User avatar" />
</div>
        </div>
      </header>

      <div className="main-content">
        {/* SIDEBAR */}
        <aside className={`sidebar ${showSidebar ? "active" : ""}`}>
          <button className="new-community-btn" onClick={handleNewCommunity}>+ New Community</button>
          <div className="communities-list-header">YOUR COMMUNITIES</div>
          <ul className="communities-list">
            {communities.map((c, i) => (
              <li key={c.id || i} className={`community-item ${c.active ? "active" : ""}`}>
                <div className="community-left" onClick={() => selectCommunity(c)}>
                  <span className={`status-dot ${c.active ? "active" : ""}`}></span>
                  {c.name}
                </div>
                <div className="community-options">
                  <button className="options-btn" onClick={() => {
                    setCommunityToDelete(c);
                    setShowDeleteModal(true);
                  }}>⋮</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="current-user">
            <div className="user-avatar"><img src={profileImage} alt="User" /></div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-status online">Online</div>
            </div>
          </div>
        </aside>

        {/* CHAT AREA */}
        <main className="chat-area">
          <div className="chat-header">
            <div className="community-info">
              <h2>{currentCommunity?.name || "Select a Community"}</h2>
              <span className="member-count">{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="chat-controls">
              <button className="control-btn">📞</button>
              <button className="control-btn">🎥</button>
              <button className="control-btn">⚙️</button>
              <button className="control-btn" onClick={() => setShowMembers(!showMembers)}>👥</button>
            </div>
          </div>

          <div className="messages-container">
            {messages.map(m => (
              <div key={m._id || m.id} className="message">
                <div className="message-avatar">
                  <img src={m.avatar || "/default-avatar.png"} alt="Sender" />
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="sender-name">{m.sender}</span>
                    <span className="timestamp">{m.timestamp}</span>
                  </div>
                  <div className="message-text">{m.content}</div>
                </div>
              </div>
            ))}
          </div>

          <form className="message-input-container" onSubmit={handleSendMessage}>
          <div className="emoji-wrapper">
  <button type="button" className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
  {showEmojiPicker && (
    <div className="emoji-picker-container">
      <EmojiPicker onEmojiClick={(emojiData) => setNewMessage(prev => prev + emojiData.emoji)} />
    </div>
  )}
</div>
            <input
              type="text"
              className="message-input"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            
            <button type="submit" className="send-btn">📤</button>
          </form>
        </main>

        {/* MEMBERS SIDEBAR */}
        {showMembers && (
          <aside className="members-sidebar">
            <h3>Community Members</h3>
            <ul className="members-list">
              {members.length === 0 ? (
                <p>No members yet</p>
              ) : (
                members.map((m) => (
                  <li key={m._id || m.id} className="member-item">
                    <div className="member-avatar">
                      <img src={m.avatar || "/default-avatar.png"} alt={m.name} />
                    </div>
                    <div className="member-info">
                      <div className="member-name">{m.name}</div>
                      <div className={`member-status ${m.status}`}>{m.status}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </aside>
        )}
      </div>

      {/* DELETE MODAL */}
      <DeleteModal
        show={showDeleteModal}
        communityName={communityToDelete?.name}
        onCancel={() => {
          setShowDeleteModal(false);
          setCommunityToDelete(null);
        }}
        onConfirm={() => handleDeleteCommunity(communityToDelete?.id)}
      />
    </div>
  );
}

export default Home;