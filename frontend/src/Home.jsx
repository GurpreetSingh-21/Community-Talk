import { useState, useEffect } from "react";
import axios from "axios";
import DeleteModal from './components/DeleteModal';
import { jwtDecode } from 'jwt-decode';



function Home({ onLogout }) {
  const [communities, setCommunities] = useState([]);
  const [currentCommunity, setCurrentCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(window.innerWidth > 1024);
  const [selectedCommunityForOptions, setSelectedCommunityForOptions] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState(null);
  

  const [userName, setUserName] = useState("");

useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    const decoded = jwtDecode(token);
    setUserName(decoded.fullName || decoded.username || decoded.email || "User");
  }
}, []);

  useEffect(() => {
    const handleResize = () => {
      setShowMembers(window.innerWidth > 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const token = localStorage.getItem('token'); 
        const res = await axios.get('http://localhost:3000/api/communities', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const fixedCommunities = res.data.map(c => ({
          id: c._id,
          name: c.name,
          active: false
        }));

        setCommunities(fixedCommunities);
        setCurrentCommunity(fixedCommunities[0] || null);
      } catch (error) {
        console.error('Error fetching communities:', error);
      }
    };

    fetchCommunities();
  }, []);

  const handleNewCommunity = async () => {
    const communityName = prompt("Enter community name:");
    if (!communityName) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:3000/api/communities",
        { name: communityName },
        { headers: { Authorization: `Bearer ${token}` }
      });

      const newCommunity = {
        id: res.data._id,
        name: res.data.name,
        active: true,
      };

      setCommunities(prev => [...prev.map(c => ({ ...c, active: false })), newCommunity]);
      setCurrentCommunity(newCommunity);
      setMessages([]);
      setMembers([]);
    } catch (error) {
      console.error("Error creating community:", error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  };

  const selectCommunity = async (community) => {
    setCurrentCommunity(community);

    const updatedCommunities = communities.map((c) => ({
      ...c,
      active: c.id === community.id,
    }));
    setCommunities(updatedCommunities);

    try {
      const token = localStorage.getItem('token');

      const res = await axios.get(`http://localhost:3000/api/messages/${community.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(res.data);

      const membersRes = await axios.get(`http://localhost:3000/api/members/${community.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(membersRes.data);

    } catch (error) {
      console.error('Error fetching community data:', error);
      setMessages([]);
      setMembers([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentCommunity || !currentCommunity.id) {
      alert("Please select a community and type a message.");
      return;
    }

    const messageData = {
      content: newMessage,
      communityId: currentCommunity.id,
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3000/api/messages",
        messageData,
        { headers: { Authorization: `Bearer ${token}` }
      });

      setNewMessage("");

      const res = await axios.get(`http://localhost:3000/api/messages/${currentCommunity.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);

      setTimeout(() => {
        const container = document.querySelector(".messages-container");
        if (container) container.scrollTop = container.scrollHeight;
      }, 100);

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleOptionsClick = (community) => {
    if (selectedCommunityForOptions && selectedCommunityForOptions.id === community.id) {
      setSelectedCommunityForOptions(null);
    } else {
      setSelectedCommunityForOptions(community);
    }
  };

  const handleDeleteCommunity = async (communityId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this community?");
    if (!confirmDelete) return;
  
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/communities/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // After deletion, remove community from UI
      const updatedCommunities = communities.filter((c) => c.id !== communityId);
      setCommunities(updatedCommunities);
  
      // Reset current community if the deleted one was selected
      if (currentCommunity && currentCommunity.id === communityId) {
        setCurrentCommunity(updatedCommunities[0] || null);
        setMessages([]);
        setMembers([]);
      }
  
      alert("Community deleted successfully!");
    } catch (error) {
      console.error("Error deleting community:", error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  };
  
  return (
    <div className="home-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <button
            className="hamburger-btn"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            ☰
          </button>
          Community Talk
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search communities..."
            className="search-input"
          />
        </div>

        <div className="user-controls">
          <button className="notification-btn">
            <span className="notification-icon">🔔</span>
          </button>
          <div className="user-avatar" onClick={onLogout}>
            <img src="/chawa.jpeg" alt="User avatar" />
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className={`sidebar ${showSidebar ? "active" : ""}`}>
          <button className="new-community-btn" onClick={handleNewCommunity}>
            + New Community
          </button>

          <div className="communities-list-header">YOUR COMMUNITIES</div>

          <ul className="communities-list">
  {communities.length === 0 ? (
    <p>Loading communities...</p>
  ) : (
    communities.map((community) => (
      <li key={community.id} className={`community-item ${community.active ? "active" : ""}`}>
        <div className="community-left" onClick={() => selectCommunity(community)}>
          <span className={`status-dot ${community.active ? "active" : ""}`}></span>
          {community.name}
        </div>

        <div className="community-options">
        <button
  className="options-btn"
  onClick={() => {
    setCommunityToDelete(community);
    setShowDeleteModal(true);
  }}
>
  ⋮
</button>

        </div>
      </li>
    ))
  )}
</ul>


          <div className="current-user">
            <div className="user-avatar">
              <img src="/chawa.jpeg" alt="User avatar" />
            </div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-status online">Online</div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="chat-area">
          <div className="chat-header">
            <div className="community-info">
              <h2>{currentCommunity ? currentCommunity.name : "Select a Community"}</h2>
              <span className="member-count">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="chat-controls">
              <button className="control-btn call">📞</button>
              <button className="control-btn video">🎥</button>
              <button className="control-btn settings">⚙️</button>
              <button className="control-btn" onClick={() => setShowMembers(!showMembers)}>👥</button>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message) => (
              <div key={message._id || message.id} className="message">
                <div className="message-avatar">
                  <img src={message.avatar || "/default-avatar.png"} alt={`${message.sender || "User"} avatar`} />
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="sender-name">{message.sender}</span>
                    <span className="timestamp">{message.timestamp}</span>
                  </div>
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}
          </div>

          <form className="message-input-container" onSubmit={handleSendMessage}>
            <button type="button" className="emoji-btn">😊</button>
            <input
              type="text"
              placeholder="Type your message..."
              className="message-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="button" className="attachment-btn">📎</button>
            <button type="submit" className="send-btn">📤</button>
          </form>
        </main>

        {/* Members Sidebar */}
        {showMembers && (
          <aside className="members-sidebar">
            <h3>Community Members</h3>
            <ul className="members-list">
              {members.length === 0 ? (
                <p>No members yet</p>
              ) : (
                members.map((member) => (
                  <li key={member._id || member.id} className="member-item">
                    <div className="member-avatar">
                      <img src={member.avatar || "/default-avatar.png"} alt={`${member.name} avatar`} />
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className={`member-status ${member.status}`}>
                        {member.status}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </aside>
        )}
      </div>

      <DeleteModal
  show={showDeleteModal}
  communityName={communityToDelete?.name}
  onCancel={() => {
    setShowDeleteModal(false);
    setCommunityToDelete(null);
  }}
  onConfirm={async () => {
    if (!communityToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/communities/${communityToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedCommunities = communities.filter((c) => c.id !== communityToDelete.id);
      setCommunities(updatedCommunities);

      if (currentCommunity && currentCommunity.id === communityToDelete.id) {
        setCurrentCommunity(updatedCommunities[0] || null);
        setMessages([]);
        setMembers([]);
      }

      setShowDeleteModal(false);
      setCommunityToDelete(null);

      alert("Community deleted successfully!");
    } catch (error) {
      console.error("Error deleting community:", error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  }}
/>

    </div>
  );
}

export default Home;
