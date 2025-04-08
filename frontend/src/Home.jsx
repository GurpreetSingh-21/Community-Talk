import { useState, useEffect } from "react";

function Home({ onLogout }) {
  const [communities, setCommunities] = useState([
    { id: 1, name: "Queens College", active: true },
    { id: 2, name: "Baruch College", active: false },
    { id: 3, name: "Hunter College", active: false },
  ]);

  const [currentCommunity, setCurrentCommunity] = useState(communities[0]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "Chawa",
      avatar: "/chawa.jpeg",
      content: "Hi chawa!",
      timestamp: "10:30 AM",
    },
    {
      id: 2,
      sender: "Nafis",
      avatar: "/nafis.jpeg",
      content: "Hi nafis",
      timestamp: "10:32 AM",
    },
  ]);

  const [members, setMembers] = useState([
    { id: 1, name: "Chawa", status: "online", avatar: "/chawa.jpeg" },
    { id: 2, name: "Nafis", status: "online", avatar: "/nafis.jpeg" },
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      setShowMembers(window.innerWidth > 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const currentUser = { id: 4, name: "Lotta", avatar: "/lotta.jpeg" };

    const newMsg = {
      id: messages.length + 1,
      sender: currentUser.name,
      avatar: currentUser.avatar,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  const selectCommunity = (community) => {
    setCurrentCommunity(community);

    // Update active state for UI
    const updatedCommunities = communities.map((c) => ({
      ...c,
      active: c.id === community.id,
    }));

    setCommunities(updatedCommunities);
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
          <button className="new-community-btn">+ New Community</button>

          <div className="communities-list-header">YOUR COMMUNITIES</div>
          <ul className="communities-list">
            {communities.map((community) => (
              <li
                key={community.id}
                className={`community-item ${community.active ? "active" : ""}`}
                onClick={() => selectCommunity(community)}
              >
                <span
                  className={`status-dot ${community.active ? "active" : ""}`}
                ></span>
                {community.name}
              </li>
            ))}
          </ul>

          <div className="current-user">
            <div className="user-avatar">
              <img src="/chawa.jpeg" alt="User avatar" />
            </div>
            <div className="user-info">
              <div className="user-name">Chawa</div>
              <div className="user-status online">Online</div>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <main className="chat-area">
          <div className="chat-header">
            <div className="community-info">
              <h2>{currentCommunity.name}</h2>
              <span className="member-count">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="chat-controls">
              <button className="control-btn call">📞</button>
              <button className="control-btn video">🎥</button>
              <button className="control-btn settings">⚙️</button>
              <button
                className="control-btn"
                onClick={() => setShowMembers(!showMembers)}
              >
                👥
              </button>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className="message">
                <div className="message-avatar">
                  <img src={message.avatar} alt={`${message.sender} avatar`} />
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

          <form
            className="message-input-container"
            onSubmit={handleSendMessage}
          >
            <button type="button" className="emoji-btn">
              😊
            </button>
            <input
              type="text"
              placeholder="Type your message..."
              className="message-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="button" className="attachment-btn">
              📎
            </button>
            <button type="submit" className="send-btn">
              📤
            </button>
          </form>
        </main>

        {/* Members sidebar */}
        {showMembers && (
          <aside className="members-sidebar">
            <h3>Community Members</h3>
            <ul className="members-list">
              {members.map((member) => (
                <li key={member.id} className="member-item">
                  <div className="member-avatar">
                    <img src={member.avatar} alt={`${member.name} avatar`} />
                  </div>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className={`member-status ${member.status}`}>
                      {member.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Home;
