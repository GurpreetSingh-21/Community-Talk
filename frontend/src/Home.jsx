// frontend/src/Home.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import { useNavigate } from "react-router-dom";

import DeleteModal from "./components/DeleteModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const API = useMemo(() => {
    const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
    return RAW.replace(/\/+$/, "");
  }, []);

  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [currentCommunity, setCurrentCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(() => window.innerWidth > 1024);
  const [isSwitchingCommunity, setIsSwitchingCommunity] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState(null);

  const [socket, setSocket] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [dmHistory, setDmHistory] = useState([]);
  const [dmPanelUser, setDmPanelUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState("");

  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || "/default-avatar.png"
  );

  // helpful UI notice if the backend denies access (403)
  const [accessNotice, setAccessNotice] = useState("");

  const navigate = useNavigate();

  const authHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fmt = (ts) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts ?? "";
    }
  };

  const upsertNotification = (partnerId, partnerName, content) => {
    setNotifications((cur) => {
      const copy = [...cur];
      const idx = copy.findIndex((n) => n.partnerId === partnerId);
      if (idx > -1) copy[idx] = { partnerId, partnerName, content };
      else copy.push({ partnerId, partnerName, content });
      return copy;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const { id, fullName, email } = jwtDecode(token);
    setUserId(id);
    setUserName(fullName || email);
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/direct-messages`, {
          headers: authHeader(),
        });
        setDmHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load DM history:", err);
      }
    })();
  }, [userId, API]);

  useEffect(() => {
    const onResize = () => setShowMembers(window.innerWidth > 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/communities`, {
          headers: authHeader(),
        });

        // Accept either array or { items: [...] }
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const fixed = list.map((c) => ({ id: c._id, name: c.name, active: false }));
        setCommunities(fixed);
        if (fixed.length) selectCommunity(fixed[0]);
      } catch (e) {
        console.error("Error loading communities:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem("token");
    const sock = io(API, { auth: { token } });
    setSocket(sock);

    sock.emit("join", userId);

    sock.on("receive_message", (data) => {
      if (data.communityId === currentCommunity?.id) {
        setMessages((m) => [...m, data]);
        setTimeout(() => {
          const el = document.querySelector("[data-messages-container]");
          el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }, 30);
      }
    });

    sock.on("receive_direct_message", (dm) => {
      if (dm.from === userId) return;
      upsertNotification(dm.from, dm.senderName, dm.content);
      if (dmPanelUser?._id === dm.from) {
        setDmMessages((m) => [...m, dm]);
      }
    });

    return () => sock.disconnect();
  }, [userId, currentCommunity, dmPanelUser, API]);

  useEffect(() => {
    const panel = document.querySelector("[data-dm-messages]");
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [dmMessages]);

  const selectCommunity = async (c) => {
  if (!c?.id || isSwitchingCommunity) return;
  setIsSwitchingCommunity(true);
  setAccessNotice("");
  setCurrentCommunity(c);
  setCommunities((cs) => cs.map((x) => ({ ...x, active: x.id === c.id })));

  try {
    const [mr, mb] = await Promise.all([
      axios.get(`${API}/api/messages/${c.id}`, { headers: authHeader() }),
      axios.get(`${API}/api/members/${c.id}`, { headers: authHeader() }),
    ]);

    // Messages: always array
    setMessages(Array.isArray(mr.data) ? mr.data : []);

    // Members: normalize shape
    const memberItems = Array.isArray(mb.data?.items)
      ? mb.data.items
      : Array.isArray(mb.data)
      ? mb.data
      : [];
    setMembers(memberItems);

    // Auto-scroll to bottom
    setTimeout(() => {
      const el = document.querySelector("[data-messages-container]");
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 30);
  } catch (e) {
    // Gracefully show why it failed
    if (axios.isAxiosError(e)) {
      if (e.response?.status === 403) {
        setAccessNotice(
          "You don’t have access to this community’s messages. (If you’re in dev, set SKIP_DOMAIN_CHECK=true in the backend .env and restart the server.)"
        );
      } else if (e.response?.status === 401) {
        setAccessNotice("Your session is invalid or expired. Please log in again.");
      } else if (e.response?.data?.error) {
        setAccessNotice(`Error: ${e.response.data.error}`);
      } else {
        setAccessNotice("Could not load messages/members for this community.");
      }
    } else {
      setAccessNotice("Could not load messages/members for this community.");
    }
    setMessages([]);
    setMembers([]);
  } finally {
    setIsSwitchingCommunity(false);
  }
};

  const handleNewCommunity = async () => {
    const name = prompt("Enter community name:");
    if (!name) return;
    try {
      const { data } = await axios.post(
        `${API}/api/communities`,
        { name },
        { headers: authHeader() }
      );
      const nc = { id: data._id, name: data.name, active: true };
      setCommunities((cs) => cs.map((x) => ({ ...x, active: false })).concat(nc));
      setCurrentCommunity(nc);
      setMessages([]);
      setMembers([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentCommunity?.id) return;
    try {
      await axios.post(
        `${API}/api/messages`,
        {
          sender: userName,
          senderId: userId,
          content: newMessage,
          communityId: currentCommunity.id,
        },
        { headers: authHeader() }
      );
      setNewMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteCommunity = (c) => {
    setCommunityToDelete(c);
    setShowDeleteModal(true);
  };

  const handleDeleteCommunity = async (id) => {
    try {
      await axios.delete(`${API}/api/communities/${id}`, { headers: authHeader() });
      const upd = communities.filter((x) => x.id !== id);
      setCommunities(upd);
      if (currentCommunity?.id === id) {
        setCurrentCommunity(upd[0] || null);
        setMessages([]);
        setMembers([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShowDeleteModal(false);
      setCommunityToDelete(null);
    }
  };

  const openDmPanel = async (user) => {
    const panelUser = {
      _id: user._id,
      fullName: user.fullName || user.name || user.email || "User",
    };
    setDmPanelUser(panelUser);
    setNotifications((n) => n.filter((x) => x.partnerId !== panelUser._id));
    try {
      const { data } = await axios.get(`${API}/api/direct-messages/${panelUser._id}`, {
        headers: authHeader(),
      });
      setDmMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const sendDirectMessage = async () => {
    if (!dmInput.trim() || !dmPanelUser) return;
    try {
      const { data } = await axios.post(
        `${API}/api/direct-messages`,
        { to: dmPanelUser._id, content: dmInput },
        { headers: authHeader() }
      );
      setDmMessages((m) => [...m, data]);
      setDmInput("");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="flex h-14 items-center justify-between border-b border-indigo-700/20 bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 text-white shadow">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
          onClick={() => setShowSidebar((s) => !s)}
          aria-label="Toggle sidebar"
        >
          ☰
        </Button>
        <h1 className="text-sm font-semibold sm:text-base">Community Talk</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            size="icon"
            aria-label="Notifications"
          >
            🔔
          </Button>
          <Avatar
            className="size-8 cursor-pointer ring-2 ring-white/30"
            onClick={() => navigate("/profile")}
          >
            <AvatarImage src={profileImage} />
            <AvatarFallback>{userName?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className={[
            "z-20 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white/90 p-3 backdrop-blur transition-transform md:translate-x-0",
            showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
        >
          <Button
            className="mb-4 w-full bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleNewCommunity}
          >
            + New Community
          </Button>

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your Communities
          </div>
          <ScrollArea className="flex-1">
            <ul className="space-y-1 pr-2">
              {communities.map((c) => (
                <li
                  key={c.id}
                  className={[
                    "flex items-center justify-between rounded-md px-2 py-2 hover:bg-indigo-50",
                    c.active ? "bg-indigo-50 text-indigo-700" : "text-slate-700",
                  ].join(" ")}
                >
                  <button
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => selectCommunity(c)}
                  >
                    <span
                      className={[
                        "inline-block size-2 rounded-full",
                        c.active ? "bg-indigo-600" : "bg-slate-300",
                      ].join(" ")}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => confirmDeleteCommunity(c)}
                    aria-label={`Delete ${c.name}`}
                  >
                    ⋮
                  </Button>
                </li>
              ))}
            </ul>

            {/* All Conversations */}
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                All Conversations
              </h4>
              <ul className="space-y-1 pr-2">
                {dmHistory.map((u) => (
                  <li key={u._id}>
                    <button
                      className={[
                        "w-full rounded-md px-2 py-2 text-left hover:bg-indigo-50",
                        dmPanelUser?._id === u._id
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-700",
                      ].join(" ")}
                      onClick={() => openDmPanel(u)}
                    >
                      {u.fullName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unseen DM Notifications */}
            {notifications.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                  New DMs
                </h4>
                <ul className="space-y-1 pr-2">
                  {notifications.map((n) => (
                    <li key={n.partnerId}>
                      <button
                        className="w-full rounded-md px-2 py-2 text-left text-slate-700 hover:bg-indigo-50"
                        onClick={() =>
                          openDmPanel({ _id: n.partnerId, fullName: n.partnerName })
                        }
                      >
                        <strong className="text-indigo-700">
                          {n.partnerName}:{" "}
                        </strong>
                        <span className="text-slate-500">{n.content}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>

          <Separator className="my-3" />
          <div className="mt-auto flex items-center gap-3">
            <Avatar className="size-8 ring-2 ring-indigo-100">
              <AvatarImage src={profileImage} />
              <AvatarFallback>{userName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium text-slate-800">{userName}</div>
              <div className="text-xs font-medium text-emerald-600">Online</div>
            </div>
          </div>
        </aside>

        {/* CHAT AREA */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {currentCommunity?.name || "Select a Community"}
              </h2>
              <span className="text-xs text-slate-500">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div>
              <Button
                variant="outline"
                size="icon"
                className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setShowMembers((m) => !m)}
              >
                👥
              </Button>
            </div>
          </div>

          {/* Access notice */}
          {accessNotice && (
            <div className="bg-amber-50 px-4 py-2 text-sm text-amber-800 border-b border-amber-200">
              {accessNotice}
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 bg-slate-50 px-4 py-3" data-messages-container>
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className="flex items-start gap-3"
                  onMouseEnter={() => setHoveredMessageId(m._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="relative">
                    <Avatar className="size-10 ring-2 ring-indigo-100">
                      <AvatarImage src={m.avatar || "/default-avatar.png"} />
                      <AvatarFallback>{(m.sender || "?")?.[0]}</AvatarFallback>
                    </Avatar>

                    {hoveredMessageId === m._id && (
                      <Button
                        size="sm"
                        className="absolute left-[44px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700"
                        onClick={() =>
                          openDmPanel({ _id: m.senderId, fullName: m.sender })
                        }
                      >
                        Text/Chat
                      </Button>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="truncate text-slate-800">{m.sender}</strong>
                      <span className="text-xs text-slate-500">{fmt(m.timestamp)}</span>
                    </div>
                    <p className="mt-1 max-w-prose break-words rounded-2xl bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200">
                      {m.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setShowEmojiPicker((s) => !s)}
                aria-label="Emoji"
              >
                😊
              </Button>
              {showEmojiPicker && (
                <div className="relative">
                  <div className="absolute bottom-12 z-10">
                    <EmojiPicker onEmojiClick={(e) => setNewMessage((n) => n + e.emoji)} />
                  </div>
                </div>
              )}
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message…"
                className="flex-1"
              />
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700" type="submit">
                📤
              </Button>
            </div>
          </form>
        </main>

        {/* RIGHT PANEL */}
        <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white md:flex md:flex-col">
          {showMembers && (
            <div className="flex-1 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Community Members
              </h3>
              <ScrollArea className="h-full">
                <ul className="space-y-1 pr-2">
                  {members.map((m) => (
                    <li
                      key={m._id}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-slate-700 hover:bg-indigo-50",
                        m._id === userId ? "bg-indigo-50" : "",
                      ].join(" ")}
                      onClick={() => openDmPanel(m)}
                    >
                      <Avatar className="size-9 ring-2 ring-indigo-100">
                        <AvatarImage src={m.avatar || "/default-avatar.png"} />
                        <AvatarFallback>
                          {(m.fullName || m.name || m.email || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {m.fullName || m.name || m.email}
                      </span>
                      <span
                        className={[
                          "ml-auto text-xs font-medium",
                          (m.status || "").toLowerCase() === "online"
                            ? "text-emerald-600"
                            : "text-red-500",
                        ].join(" ")}
                      >
                        {m.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {dmPanelUser && (
            <div className="flex max-h-[420px] flex-1 flex-col p-3">
              <Card className="flex h-full flex-col border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Chat with <span className="text-indigo-700">{dmPanelUser.fullName}</span>
                  </h4>
                  <Button variant="ghost" size="icon" onClick={() => setDmPanelUser(null)}>
                    ✕
                  </Button>
                </div>

                <div className="mb-2 flex-1 overflow-y-auto pr-1" data-dm-messages>
                  <div className="flex flex-col gap-2">
                    {dmMessages.map((d, i) => (
                      <div
                        key={i}
                        className="max-w-[80%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800"
                      >
                        {d.content}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Input
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    placeholder="Type your message…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendDirectMessage();
                      }
                    }}
                  />
                  <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={sendDirectMessage}>
                    Send
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </aside>
      </div>

      {/* Delete modal */}
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