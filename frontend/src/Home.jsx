// import { useState, useEffect } from "react";
// import axios from "axios";
// import { jwtDecode } from "jwt-decode";
// import DeleteModal from "./components/DeleteModal";
// import { io } from "socket.io-client";
// import EmojiPicker from 'emoji-picker-react';
// import { useNavigate } from "react-router-dom";

// function Home({ onLogout }) {
//   const [userName, setUserName] = useState("");
//   const [communities, setCommunities] = useState([]);
//   const [currentCommunity, setCurrentCommunity] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [members, setMembers] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [showSidebar, setShowSidebar] = useState(true);
//   const [showMembers, setShowMembers] = useState(window.innerWidth > 1024);
//   const [isSwitchingCommunity, setIsSwitchingCommunity] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [communityToDelete, setCommunityToDelete] = useState(null);
//   const [socket, setSocket] = useState(null);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const navigate = useNavigate();

//   // Direct-message panel state
//   const [dmPanelUser, setDmPanelUser] = useState(null);
//   const [dmMessages, setDmMessages] = useState([]);
//   const [dmInput, setDmInput] = useState("");

//   // Hover state for “Text/Chat” button on messages
//   const [hoveredMessageId, setHoveredMessageId] = useState(null);

//   // User avatar from localStorage (or default)
//   const [profileImage, setProfileImage] = useState(
//     localStorage.getItem("profileImage") || "/default-avatar.png"
//   );

//   // Decode JWT once on mount to get userName
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     const { fullName, email } = jwtDecode(token);
//     setUserName(fullName || email);
//   }, []);

//   // Responsive members sidebar
//   useEffect(() => {
//     const onResize = () => setShowMembers(window.innerWidth > 1024);
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//   // Fetch communities on mount
//   useEffect(() => {
//     (async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const { data } = await axios.get(
//           "http://localhost:3000/api/communities",
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const fixed = data.map(c => ({ id: c._id, name: c.name, active: false }));
//         setCommunities(fixed);
//         if (fixed.length > 0) selectCommunity(fixed[0]);
//       } catch (e) {
//         console.error("Error fetching communities:", e);
//       }
//     })();
//   }, []);

//   // Single Socket.IO setup for both group + direct messages
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     const sock = io("http://localhost:3000", { auth: { token } });
//     setSocket(sock);

//     const { id } = jwtDecode(token);
//     // Join personal room
//     sock.emit("join", id);

//     // Listen for new group messages
//     sock.on("receive_message", data => {
//       console.log("🔴 Got socket message:", data);
//       if (data.communityId === currentCommunity?.id) {
//         setMessages(prev => [...prev, data]);
//         // auto-scroll
//         setTimeout(() => {
//           document.querySelector(".messages-container")?.scrollTo(0, 9999);
//         }, 50);
//       }
//     });

//     // Listen for direct messages
//     sock.on("receive_direct_message", dm => {
//       if (
//         dmPanelUser &&
//         (dm.from === dmPanelUser._id || dm.to === dmPanelUser._id)
//       ) {
//         setDmMessages(prev => [...prev, dm]);
//       }
//     });

//     return () => sock.disconnect();
//   }, [currentCommunity, dmPanelUser]);

//   // Auto-scroll DM panel
//   useEffect(() => {
//     const panel = document.querySelector(".dm-messages");
//     if (panel) panel.scrollTop = panel.scrollHeight;
//   }, [dmMessages]);

//   // Select a community, fetch its messages & members
//   const selectCommunity = async community => {
//     if (!community.id || isSwitchingCommunity) return;
//     setIsSwitchingCommunity(true);
//     setCurrentCommunity(community);
//     setCommunities(cs =>
//       cs.map(c => ({ ...c, active: c.id === community.id }))
//     );
//     try {
//       const token = localStorage.getItem("token");
//       const [mr, mb] = await Promise.all([
//         axios.get(`http://localhost:3000/api/messages/${community.id}`, {
//           headers: { Authorization: `Bearer ${token}` }
//         }),
//         axios.get(`http://localhost:3000/api/members/${community.id}`, {
//           headers: { Authorization: `Bearer ${token}` }
//         })
//       ]);
//       setMessages(mr.data);
//       setMembers(mb.data);
//       setTimeout(() => {
//         document.querySelector(".messages-container")?.scrollTo(0, 9999);
//       }, 50);
//     } catch (e) {
//       console.error("Error loading community data:", e);
//       setMessages([]);
//       setMembers([]);
//     } finally {
//       setIsSwitchingCommunity(false);
//     }
//   };

//   // Create a new community
//   const handleNewCommunity = async () => {
//     const name = prompt("Enter community name:");
//     if (!name) return;
//     try {
//       const token = localStorage.getItem("token");
//       const { data } = await axios.post(
//         "http://localhost:3000/api/communities",
//         { name },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       const nc = { id: data._id, name: data.name, active: true };
//       setCommunities(cs => cs.map(c => ({ ...c, active: false })).concat(nc));
//       setCurrentCommunity(nc);
//       setMessages([]);
//       setMembers([]);
//     } catch (e) {
//       console.error("Error creating community:", e);
//     }
//   };

//   // Send a group message
//   const handleSendMessage = async e => {
//     e.preventDefault();
//     if (!newMessage.trim() || !currentCommunity?.id) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.post(
//         "http://localhost:3000/api/messages",
//         {
//           sender: userName,
//           senderId: jwtDecode(token).id,
//           content: newMessage,
//           communityId: currentCommunity.id
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setNewMessage("");
//     } catch (e) {
//       console.error("Error sending message:", e);
//     }
//   };

//   // Delete community
//   const handleDeleteCommunity = async id => {
//     if (!confirm("Delete this community?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`http://localhost:3000/api/communities/${id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       const upd = communities.filter(c => c.id !== id);
//       setCommunities(upd);
//       if (currentCommunity?.id === id) {
//         setCurrentCommunity(upd[0] || null);
//         setMessages([]);
//         setMembers([]);
//       }
//     } catch (e) {
//       console.error("Error deleting community:", e);
//     }
//   };

//   // Open the DM panel for a given user
//   const openDmPanel = async user => {
//     setDmPanelUser(user);
//     setDmMessages([]);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(
//         `http://localhost:3000/api/direct-messages/${user._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setDmMessages(res.data);
//     } catch (e) {
//       console.error("Error fetching DM history:", e);
//     }
//   };

//   // Send a direct message
//   const sendDirectMessage = async () => {
//     if (!dmInput.trim() || !dmPanelUser) return;
//     try {
//       const token = localStorage.getItem("token");
//       const { data } = await axios.post(
//         "http://localhost:3000/api/direct-messages",
//         { to: dmPanelUser._id, content: dmInput },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setDmMessages(prev => [...prev, data]);
//       setDmInput("");
//     } catch (e) {
//       console.error("Error sending DM:", e);
//     }
//   };

//   return (
//     <div className="home-container">
//       {/* HEADER */}
//       <header className="header">
//         <div className="logo">
//           <button onClick={() => setShowSidebar(s => !s)}>☰</button>
//           Community Talk
//         </div>
//         <div className="search-container">
//           <input placeholder="Search communities..." />
//         </div>
//         <div className="user-controls">
//           <button>🔔</button>
//           <div onClick={() => navigate("/profile")}>
//             <img src={profileImage} alt="avatar" className="user-avatar" />
//           </div>
//         </div>
//       </header>

//       <div className="main-content">
//         {/* LEFT SIDEBAR */}
//         <aside className={`sidebar ${showSidebar ? "active" : ""}`}>
//           <button onClick={handleNewCommunity}>+ New Community</button>
//           <div className="communities-list-header">YOUR COMMUNITIES</div>
//           <ul className="communities-list">
//             {communities.map((c, i) => (
//               <li key={i} className={c.active ? "active" : ""}>
//                 <div onClick={() => selectCommunity(c)}>
//                   <span className={`status-dot ${c.active ? "active" : ""}`} />
//                   {c.name}
//                 </div>
//                 <div>
//                   <button
//                     onClick={() => {
//                       setCommunityToDelete(c);
//                       setShowDeleteModal(true);
//                     }}
//                   >
//                     ⋮
//                   </button>
//                 </div>
//               </li>
//             ))}
//           </ul>
//           <div className="current-user">
//             <img src={profileImage} alt="User" className="user-avatar" />
//             <div>
//               <div>{userName}</div>
//               <div className="user-status online">Online</div>
//             </div>
//           </div>
//         </aside>

//         {/* CHAT AREA */}
//         <main className="chat-area">
//           <div className="chat-header">
//             <div>
//               <h2>{currentCommunity?.name || "Select a Community"}</h2>
//               <span>{members.length} member{members.length !== 1 && "s"}</span>
//             </div>
//             <div>
//               <button>📞</button><button>🎥</button><button>⚙️</button>
//               <button onClick={() => setShowMembers(m => !m)}>👥</button>
//             </div>
//           </div>

//           {/* messages */}
//           <div className="messages-container">
//             {messages.map(m => (
//               <div
//                 key={m._id}
//                 className="message"
//                 onMouseEnter={() => setHoveredMessageId(m._id)}
//                 onMouseLeave={() => setHoveredMessageId(null)}
//               >
//                 <div className="message-avatar-wrapper">
//                   <img
//                     src={m.avatar || "/default-avatar.png"}
//                     alt=""
//                     className="message-avatar"
//                   />
//                   {hoveredMessageId === m._id && (
//                     <button
//                       className="dm-btn"
//                       onClick={() =>
//                         openDmPanel({ _id: m.senderId, fullName: m.sender })
//                       }
//                     >
//                       Text/Chat
//                     </button>
//                   )}
//                 </div>
//                 <div className="message-content">
//                   <div className="message-header">
//                     <span className="sender-name">{m.sender}</span>
//                     <span className="timestamp">{m.timestamp}</span>
//                   </div>
//                   <div className="message-text">{m.content}</div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* send */}
//           <form className="message-input-container" onSubmit={handleSendMessage}>
//             <button
//               type="button"
//               onClick={() => setShowEmojiPicker(e => !e)}
//             >😊</button>
//             {showEmojiPicker && (
//               <EmojiPicker
//                 onEmojiClick={(_, emoji) => setNewMessage(n => n + emoji)}
//               />
//             )}
//             <input
//               type="text"
//               placeholder="Type your message..."
//               value={newMessage}
//               onChange={e => setNewMessage(e.target.value)}
//             />
//             <button type="submit">📤</button>
//           </form>
//         </main>

//         {/* RIGHT PANEL */}
//         <aside className="right-panel">
//           {/* members list */}
//           {showMembers && (
//             <div className="members-sidebar">
//               <h3>Community Members</h3>
//               <ul>
//                 {members.map(m => (
//                   <li key={m._id} onClick={() => openDmPanel(m)}>
//                     <img
//                       src={m.avatar || "/default-avatar.png"}
//                       alt={m.name}
//                     />
//                     <div>
//                       <div>{m.name}</div>
//                       <div className={m.status}>{m.status}</div>
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {/* direct-message panel */}
//           {dmPanelUser && (
//             <div className="dm-panel">
//               <div className="dm-header">
//                 <h4>Chat with {dmPanelUser.fullName}</h4>
//                 <button onClick={() => setDmPanelUser(null)}>✕</button>
//               </div>
//               <div className="dm-messages">
//                 {dmMessages.map((d, i) => (
//                   <div key={i} className="dm-message">{d.content}</div>
//                 ))}
//               </div>
//               <div className="dm-input-container">
//                 <input
//                   value={dmInput}
//                   onChange={e => setDmInput(e.target.value)}
//                   placeholder="Type your message..."
//                 />
//                 <button onClick={sendDirectMessage}>Send</button>
//               </div>
//             </div>
//           )}
//         </aside>
//       </div>

//       <DeleteModal
//         show={showDeleteModal}
//         communityName={communityToDelete?.name}
//         onCancel={() => setShowDeleteModal(false)}
//         onConfirm={() => handleDeleteCommunity(communityToDelete?.id)}
//       />
//     </div>
//   );
// }


// export default Home;

import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import DeleteModal from "./components/DeleteModal";
import { io } from "socket.io-client";
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from "react-router-dom";

export default function Home({ onLogout }) {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
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

  // queue of unseen DM notifications
  const [notifications, setNotifications] = useState([]);

  // DM panel state
  const [dmPanelUser, setDmPanelUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState("");

  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || "/default-avatar.png"
  );

  // Decode JWT once
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const { id, fullName, email } = jwtDecode(token);
    setUserId(id);
    setUserName(fullName || email);
  }, []);

  // Responsive members sidebar
  useEffect(() => {
    const onResize = () => setShowMembers(window.innerWidth > 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fetch communities
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
          "http://localhost:3000/api/communities",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fixed = data.map(c => ({ id: c._id, name: c.name, active: false }));
        setCommunities(fixed);
        if (fixed.length > 0) selectCommunity(fixed[0]);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Socket.IO for group + DMs
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const sock = io("http://localhost:3000", { auth: { token } });
    setSocket(sock);

    // join your personal room
    sock.emit("join", userId);

    // group chat listener
    sock.on("receive_message", data => {
      if (data.communityId === currentCommunity?.id) {
        setMessages(m => [...m, data]);
        setTimeout(() => {
          document.querySelector(".messages-container")?.scrollTo(0, 9999);
        }, 50);
      }
    });

    // direct message listener
    sock.on("receive_direct_message", dm => {
      // ignore messages you sent
      if (dm.from === userId) return;

      // if DM panel open with that user, append
      if (dmPanelUser?._id === dm.from) {
        setDmMessages(m => [...m, dm]);
      } else {
        // queue a notification, using senderName
        setNotifications(n => [
          ...n,
          {
            _id: dm._id || Date.now(),
            from: dm.from,
            fromName: dm.senderName,
            content: dm.content
          }
        ]);
      }
    });

    return () => sock.disconnect();
  }, [userId, currentCommunity, dmPanelUser]);

  // Auto‐scroll DM panel
  useEffect(() => {
    const panel = document.querySelector(".dm-messages");
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [dmMessages]);

  // Select community & load
  const selectCommunity = async community => {
    if (!community.id || isSwitchingCommunity) return;
    setIsSwitchingCommunity(true);
    setCurrentCommunity(community);
    setCommunities(cs =>
      cs.map(c => ({ ...c, active: c.id === community.id }))
    );
    try {
      const token = localStorage.getItem("token");
      const [mr, mb] = await Promise.all([
        axios.get(`http://localhost:3000/api/messages/${community.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:3000/api/members/${community.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setMessages(mr.data);
      setMembers(mb.data);
      setTimeout(() => {
        document.querySelector(".messages-container")?.scrollTo(0, 9999);
      }, 50);
    } catch (e) {
      console.error(e);
      setMessages([]);
      setMembers([]);
    } finally {
      setIsSwitchingCommunity(false);
    }
  };

  // New community
  const handleNewCommunity = async () => {
    const name = prompt("Enter community name:");
    if (!name) return;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:3000/api/communities",
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nc = { id: data._id, name: data.name, active: true };
      setCommunities(cs => cs.map(c => ({ ...c, active: false })).concat(nc));
      setCurrentCommunity(nc);
      setMessages([]);
      setMembers([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Send group chat
  const handleSendMessage = async e => {
    e.preventDefault();
    if (!newMessage.trim() || !currentCommunity?.id) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3000/api/messages",
        {
          sender: userName,
          senderId: userId,
          content: newMessage,
          communityId: currentCommunity.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  // Delete community
  const handleDeleteCommunity = async id => {
    if (!window.confirm("Delete this community?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/communities/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const upd = communities.filter(c => c.id !== id);
      setCommunities(upd);
      if (currentCommunity?.id === id) {
        setCurrentCommunity(upd[0] || null);
        setMessages([]);
        setMembers([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open DM panel & clear notifications
  const openDmPanel = async user => {
    const panelUser = { _id: user._id, fullName: user.fullName || user.name };
    setDmPanelUser(panelUser);
    setDmMessages([]);
    setNotifications(n => n.filter(x => x.from !== panelUser._id));

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:3000/api/direct-messages/${panelUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDmMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Send DM
  const sendDirectMessage = async () => {
    if (!dmInput.trim() || !dmPanelUser) return;
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:3000/api/direct-messages",
        { to: dmPanelUser._id, content: dmInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDmMessages(m => [...m, data]);
      setDmInput("");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="home-container">
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <button className="hamburger-btn" onClick={() => setShowSidebar(s => !s)}>
            ☰
          </button>
          Community Talk
        </div>
        <div className="search-container">
          <input placeholder="Search communities…" />
        </div>
        <div className="user-controls">
          <button className="notification-btn">🔔</button>
          <div className="user-avatar" onClick={() => navigate("/profile")}>
            <img src={profileImage} alt="avatar" />
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* LEFT SIDEBAR */}
        <aside className={`sidebar ${showSidebar ? "active" : ""}`}>
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="notifications-panel">
              <h4>New DMs</h4>
              <ul>
                {notifications.map(n => (
                  <li
                    key={n._id}
                    onClick={() => openDmPanel({ _id: n.from, fullName: n.fromName })}
                  >
                    <strong>{n.fromName}</strong>: {n.content}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Communities */}
          <button className="new-community-btn" onClick={handleNewCommunity}>
            + New Community
          </button>
          <div className="communities-list-header">YOUR COMMUNITIES</div>
          <ul className="communities-list">
            {communities.map(c => (
              <li key={c.id} className={c.active ? "active" : ""}>
                <div className="community-left" onClick={() => selectCommunity(c)}>
                  <span className={`status-dot ${c.active ? "active" : ""}`} />
                  {c.name}
                </div>
                <div className="community-options">
                  <button onClick={() => { setCommunityToDelete(c); setShowDeleteModal(true); }}>
                    ⋮
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="current-user">
            <div className="user-avatar">
              <img src={profileImage} alt="User" />
            </div>
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
              <span>{members.length} member{members.length !== 1 && "s"}</span>
            </div>
            <div className="chat-controls">
              <button>📞</button><button>🎥</button><button>⚙️</button>
              <button onClick={() => setShowMembers(m => !m)}>👥</button>
            </div>
          </div>

          <div className="messages-container">
            {messages.map(m => (
              <div
                key={m._id}
                className="message"
                onMouseEnter={() => setHoveredMessageId(m._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className="message-avatar-wrapper">
                  <img src={m.avatar || "/default-avatar.png"} alt="" className="message-avatar" />
                  {hoveredMessageId === m._id && (
                    <button onClick={() => openDmPanel({ _id: m.senderId, fullName: m.sender })}>
                      Text/Chat
                    </button>
                  )}
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
            <button type="button" onClick={() => setShowEmojiPicker(s => !s)}>😊</button>
            {showEmojiPicker && (
              <EmojiPicker onEmojiClick={e => setNewMessage(n => n + e.emoji)} />
            )}
            <input
              placeholder="Type your message…"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
            />
            <button type="submit">📤</button>
          </form>
        </main>

        {/* RIGHT PANEL */}
        <aside className="right-panel">
          {showMembers && (
            <div className="members-sidebar">
              <h3>Community Members</h3>
              <ul>
                {members.map(m => (
                  <li key={m._id} onClick={() => openDmPanel(m)}>
                    <img src={m.avatar || "/default-avatar.png"} alt={m.name} />
                    <div>
                      <div>{m.name}</div>
                      <div className={m.status}>{m.status}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dmPanelUser && (
            <div className="dm-panel">
              <div className="dm-header">
                <h4>Chat with {dmPanelUser.fullName}</h4>
                <button onClick={() => setDmPanelUser(null)}>✕</button>
              </div>
              <div className="dm-messages">
                {dmMessages.map((d,i) => <div key={i} className="dm-message">{d.content}</div>)}
              </div>
              <div className="dm-input-container">
                <input
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  placeholder="Type your message…"
                />
                <button onClick={sendDirectMessage}>Send</button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <DeleteModal
        show={showDeleteModal}
        communityName={communityToDelete?.name}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => handleDeleteCommunity(communityToDelete?.id)}
      />
    </div>
  );
}