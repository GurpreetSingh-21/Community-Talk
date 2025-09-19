import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  // ───────────────────────── Config ─────────────────────────
  const API = useMemo(() => {
    const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
    return RAW.replace(/\/+$/, "");
  }, []);
  const navigate = useNavigate();

  // ───────────────────────── State ─────────────────────────
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);

  const [communities, setCommunities] = useState([]);
  const [currentCommunity, setCurrentCommunity] = useState(null);

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [showSidebar, setShowSidebar] = useState(true);
  const [showMembers, setShowMembers] = useState(() => window.innerWidth >= 1024);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
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

  const [accessNotice, setAccessNotice] = useState("");

  // New state for modern features
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeen, setLastSeen] = useState(new Map());
  const [messageReactions, setMessageReactions] = useState(new Map());

  // Refs for smooth, reliable scrolling and better UX
  const messagesViewportRef = useRef(null);
  const dmViewportRef = useRef(null);
  const messageInputRef = useRef(null);
  const dmInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ───────────────────────── Helpers ─────────────────────────
  const authHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fmt = useCallback((ts) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diff = now - date;

      // Less than a minute
      if (diff < 60000) return "just now";

      // Less than an hour
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      }

      // Less than a day
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
      }

      // Less than a week
      if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
      }

      // Fallback to date
      return date.toLocaleDateString();
    } catch {
      return ts ?? "";
    }
  }, []);

  const scrollToBottom = useCallback((ref, smooth = true) => {
    const element = ref?.current;
    if (!element) return;

    requestAnimationFrame(() => {
      const viewport = element.querySelector("[data-radix-scroll-area-viewport]") || element;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: smooth ? "smooth" : "instant"
      });
    });
  }, []);

  const upsertNotification = useCallback((partnerId, partnerName, content) => {
    setNotifications((cur) => {
      const copy = [...cur];
      const idx = copy.findIndex((n) => n.partnerId === partnerId);
      if (idx > -1) copy[idx] = { partnerId, partnerName, content };
      else copy.push({ partnerId, partnerName, content });
      return copy;
    });
  }, []);

  const handleTypingIndicator = useCallback((message) => {
    if (socket && currentCommunity?.id) {
      socket.emit("typing", { communityId: currentCommunity.id });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { communityId: currentCommunity.id });
      }, 2000);
    }
  }, [socket, currentCommunity?.id]);

  // Handle clicks outside emoji picker and mobile interactions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
        setShowMembersDrawer(false);
      }
    };

    if (showEmojiPicker || showMembersDrawer) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [showEmojiPicker, showMembersDrawer]);

  // ───────────────────────── Bootstrap ─────────────────────────
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
  }, [userId, API, authHeader]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/communities`, {
          headers: authHeader(),
        });

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        const fixed = list.map((c) => ({ id: c._id, name: c.name, active: false }));
        setCommunities(fixed);
        if (fixed.length) selectCommunity(fixed[0]);
      } catch (e) {
        console.error("Error loading communities:", e);
      }
    })();
  }, [API, authHeader]);

  // Handle resize with debouncing and improved responsiveness
  useEffect(() => {
    let timeoutId;
    const onResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const desktop = window.innerWidth >= 1024;
        setShowMembers(desktop);
        if (desktop) {
          setShowMembersDrawer(false);
          setShowSidebar(true);
        }
      }, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ───────────────────────── Socket.IO ─────────────────────────
  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem("token");
    const sock = io(API, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    setSocket(sock);

    sock.emit("join", userId);

    sock.on("receive_message", (data) => {
      if (data.communityId === currentCommunity?.id) {
        setMessages((m) => [...m, data]);
        setTimeout(() => scrollToBottom(messagesViewportRef), 100);
      }
    });

    sock.on("receive_direct_message", (dm) => {
      if (dm.to === userId) {
        upsertNotification(dm.from, dm.senderName, dm.content);
      }
      if (dmPanelUser && (dm.from === dmPanelUser._id || dm.to === dmPanelUser._id)) {
        setDmMessages((m) => [...m, dm]);
        setTimeout(() => scrollToBottom(dmViewportRef), 100);
      }
    });

    sock.on("user_online", (userId) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    });

    sock.on("user_offline", (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setLastSeen(prev => new Map(prev).set(userId, new Date()));
    });

    sock.on("typing", ({ userId: typingUserId, communityId }) => {
      if (typingUserId !== userId && communityId === currentCommunity?.id) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    sock.on("message_reaction", ({ messageId, userId, reaction }) => {
      setMessageReactions(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(messageId)) newMap.set(messageId, new Map());
        const messageReactions = newMap.get(messageId);
        messageReactions.set(userId, reaction);
        return newMap;
      });
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sock.disconnect();
    };
  }, [userId, currentCommunity, dmPanelUser, API, upsertNotification, scrollToBottom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom(messagesViewportRef);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(dmViewportRef);
  }, [dmMessages, scrollToBottom]);

  // ───────────────────────── Actions ─────────────────────────
  const selectCommunity = useCallback(async (c) => {
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

      setMessages(Array.isArray(mr.data) ? mr.data : []);

      const memberItems = Array.isArray(mb.data?.items)
        ? mb.data.items
        : Array.isArray(mb.data)
          ? mb.data
          : [];
      setMembers(memberItems);

      setTimeout(() => scrollToBottom(messagesViewportRef, false), 100);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 403) {
          setAccessNotice(
            "You don't have access to this community's messages. Contact your administrator."
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
  }, [API, authHeader, isSwitchingCommunity, scrollToBottom]);

  const handleNewCommunity = useCallback(async () => {
    const name = prompt("Enter community name:");
    if (!name?.trim()) return;
    try {
      const { data } = await axios.post(
        `${API}/api/communities`,
        { name: name.trim() },
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
  }, [API, authHeader]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentCommunity?.id) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      if (socket) {
        socket.emit("stop_typing", { communityId: currentCommunity.id });
      }
    }

    try {
      await axios.post(
        `${API}/api/messages`,
        {
          sender: userName,
          senderId: userId,
          content: messageText,
          communityId: currentCommunity.id,
        },
        { headers: authHeader() }
      );

      // Focus back to input for better UX
      messageInputRef.current?.focus();
    } catch (e) {
      console.error(e);
      setNewMessage(messageText); // Restore message on error
    }
  }, [newMessage, currentCommunity?.id, API, userName, userId, authHeader, socket]);

  const confirmDeleteCommunity = useCallback((c) => {
    setCommunityToDelete(c);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteCommunity = useCallback(async (id) => {
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
  }, [API, authHeader, communities, currentCommunity?.id]);

  const openDmPanel = useCallback(async (user) => {
    const panelUser = {
      _id: user._id,
      fullName: user.fullName || user.name || user.email || "User",
    };
    setDmPanelUser(panelUser);
    setNotifications((n) => n.filter((x) => x.partnerId !== panelUser._id));

    // Close mobile drawer if open
    setShowMembersDrawer(false);

    try {
      const { data } = await axios.get(`${API}/api/direct-messages/${panelUser._id}`, {
        headers: authHeader(),
      });
      setDmMessages(Array.isArray(data?.items) ? data.items : []);
      setTimeout(() => scrollToBottom(dmViewportRef, false), 100);
    } catch (e) {
      console.error(e);
    }
  }, [API, authHeader, scrollToBottom]);

  const sendDirectMessage = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!dmInput.trim() || !dmPanelUser) return;

    const messageText = dmInput.trim();
    setDmInput("");

    try {
      const { data } = await axios.post(
        `${API}/api/direct-messages`,
        { to: dmPanelUser._id, content: messageText },
        { headers: authHeader() }
      );
      setDmMessages((m) => [...m, data]);
      setTimeout(() => scrollToBottom(dmViewportRef), 100);

      // Focus back to input
      dmInputRef.current?.focus();
    } catch (e) {
      console.error(e);
      setDmInput(messageText); // Restore message on error
    }
  }, [dmInput, dmPanelUser, API, authHeader, scrollToBottom]);

  // ───────────────────────── UI Components ─────────────────────────
  const MembersList = ({ members, onMemberClick, className = "" }) => (
    <div className={`space-y-1 ${className}`}>
      {members.map((m) => {
        const isOnline = onlineUsers.has(m._id);
        const memberLastSeen = lastSeen.get(m._id);

        return (
          <div
            key={m._id}
            className={[
              "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-indigo-50/80 hover:shadow-sm group",
              m._id === userId ? "bg-indigo-50 ring-1 ring-indigo-100" : "",
            ].join(" ")}
            onClick={() => onMemberClick(m)}
          >
            <div className="relative">
              <Avatar className="size-9 ring-2 ring-indigo-100/50 transition-all duration-200 group-hover:ring-indigo-200">
                <AvatarImage src={m.avatar || "/default-avatar.png"} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-medium text-sm">
                  {(m.fullName || m.name || m.email || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={[
                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white transition-all duration-200",
                isOnline ? "bg-emerald-500" : "bg-slate-400"
              ].join(" ")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {m.fullName || m.name || m.email}
                {m._id === userId && (
                  <span className="ml-1 text-xs text-indigo-600 font-normal">(You)</span>
                )}
              </div>
              <div className={[
                "text-xs font-medium transition-colors duration-200",
                isOnline ? "text-emerald-600" : "text-slate-500"
              ].join(" ")}>
                {isOnline ? "Online" : memberLastSeen ? `Last seen ${fmt(memberLastSeen)}` : "Offline"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ───────────────────────── Main UI ─────────────────────────
  return (
    <div className="flex h-screen max-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 text-slate-900 antialiased overflow-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-indigo-700/20 bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 text-white shadow-lg backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 active:scale-95 transition-all duration-200 md:hidden"
          onClick={() => setShowSidebar((s) => !s)}
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>

        <h1 className="text-sm font-semibold sm:text-base tracking-wide">Community Talk</h1>

        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 transition-all duration-200"
                size="icon"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-3.5-3.5M9 12l2 2 4-4" />
                </svg>
              </Button>
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs font-bold text-white">{notifications.length}</span>
              </div>
            </div>
          )}

          <Avatar
            className="size-8 cursor-pointer ring-2 ring-white/30 hover:ring-white/50 transition-all duration-200 hover:scale-105"
            onClick={() => navigate("/profile")}
          >
            <AvatarImage src={profileImage} />
            <AvatarFallback className="bg-white/20 text-white font-medium">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className={[
            "z-30 flex w-72 shrink-0 flex-col border-r border-slate-200/60 bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out md:translate-x-0 md:relative md:z-auto",
            showSidebar ? "translate-x-0" : "-translate-x-full",
            "absolute md:relative h-full"
          ].join(" ")}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
              <Button
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] font-medium"
                onClick={handleNewCommunity}
                disabled={isSwitchingCommunity}
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Community
              </Button>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Your Communities
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-1 pr-2">
                    {communities.map((c) => (
                      <div
                        key={c.id}
                        className={[
                          "flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-indigo-50/80 transition-all duration-200 group cursor-pointer",
                          c.active ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100" : "text-slate-700",
                        ].join(" ")}
                        onClick={() => selectCommunity(c)}
                      >
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          <span
                            className={[
                              "inline-block size-2 rounded-full transition-all duration-200 shrink-0",
                              c.active ? "bg-indigo-600 shadow-sm" : "bg-slate-300 group-hover:bg-indigo-400",
                            ].join(" ")}
                          />
                          <span className="truncate font-medium text-sm">{c.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-200 h-7 w-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteCommunity(c);
                          }}
                          aria-label={`Delete ${c.name}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Direct Messages Section */}
              {(dmHistory.length > 0 || notifications.length > 0) && (
                <div className="space-y-4">
                  {dmHistory.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Conversations
                      </h4>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1 pr-2">
                          {dmHistory.map((u) => (
                            <button
                              key={u._id}
                              className={[
                                "w-full rounded-xl px-3 py-2 text-left hover:bg-indigo-50/80 transition-all duration-200 group",
                                dmPanelUser?._id === u._id
                                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                                  : "text-slate-700",
                              ].join(" ")}
                              onClick={() => openDmPanel(u)}
                            >
                              <div className="flex items-center gap-2">
                                <div className={[
                                  "size-2 rounded-full shrink-0 transition-colors duration-200",
                                  onlineUsers.has(u._id) ? "bg-emerald-500" : "bg-slate-300"
                                ].join(" ")} />
                                <span className="font-medium truncate text-sm">{u.fullName}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {notifications.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        New Messages
                      </h4>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1 pr-2">
                          {notifications.map((n) => (
                            <button
                              key={n.partnerId}
                              className="w-full rounded-xl px-3 py-2.5 text-left text-slate-700 hover:bg-indigo-50/80 transition-all duration-200 border border-indigo-200/50 bg-gradient-to-r from-indigo-50/30 to-blue-50/30"
                              onClick={() =>
                                openDmPanel({ _id: n.partnerId, fullName: n.partnerName })
                              }
                            >
                              <div className="font-semibold text-indigo-700 text-sm truncate">
                                {n.partnerName}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {n.content}
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-auto">
              <Separator className="mb-3" />
              <div className="p-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="size-10 ring-2 ring-indigo-100/50 transition-all duration-200">
                    <AvatarImage src={profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-medium">
                      {userName?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{userName}</div>
                  <div className="text-xs font-medium text-emerald-600">Online</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay for Mobile */}
        {showSidebar && (
          <div
            className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-300"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* CHAT AREA */}
        <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 relative">
          {/* Chat Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/90 backdrop-blur-md px-4 py-3 shadow-sm shrink-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-800 truncate">
                {isSwitchingCommunity ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                    Loading...
                  </span>
                ) : (
                  currentCommunity?.name || "Select a Community"
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                {isTyping && (
                  <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Someone is typing...
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-200 shrink-0"
              onClick={() => {
                if (window.innerWidth < 1024) setShowMembersDrawer(true);
                else setShowMembers((m) => !m);
              }}
              aria-label="Toggle members"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Button>
          </div>

          {/* Access Notice */}
          {accessNotice && (
            <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-800 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{accessNotice}</span>
              </div>
            </div>
          )}

          {/* Messages Area - Fixed Height Container */}
          <div className="flex-1 min-h-0 relative">
            <ScrollArea
              ref={messagesViewportRef}
              className="h-full px-4 py-3"
            >
              <div className="mx-auto max-w-4xl space-y-2 pb-4">
                {messages.map((m, index) => {
                  const reactions = messageReactions.get(m._id);
                  const isConsecutive = index > 0 &&
                    messages[index - 1].senderId === m.senderId &&
                    (new Date(m.timestamp) - new Date(messages[index - 1].timestamp)) < 300000; // 5 minutes

                  return (
                    <div
                      key={m._id}
                      className={[
                        "flex items-start gap-3 group hover:bg-slate-50/50 rounded-xl px-2 py-1.5 -mx-2 transition-all duration-200",
                        isConsecutive ? "mt-0.5" : "mt-3"
                      ].join(" ")}
                      onMouseEnter={() => setHoveredMessageId(m._id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className="relative shrink-0">
                        {!isConsecutive ? (
                          <Avatar className="size-10 ring-2 ring-indigo-100/50 transition-all duration-200 group-hover:ring-indigo-200/70">
                            <AvatarImage src={m.avatar || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-medium text-sm">
                              {(m.sender || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="size-10 flex items-center justify-center">
                            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {fmt(m.timestamp)}
                            </span>
                          </div>
                        )}

                        {hoveredMessageId === m._id && m.senderId !== userId && (
                          <Button
                            size="sm"
                            className="absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 text-xs px-3 py-1.5 z-10"
                            onClick={() => openDmPanel({ _id: m.senderId, fullName: m.sender })}
                          >
                            Message
                          </Button>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {!isConsecutive && (
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-slate-800 font-medium truncate">{m.sender}</strong>
                            <span className="text-xs text-slate-500 shrink-0">{fmt(m.timestamp)}</span>
                          </div>
                        )}

                        <div className="relative">
                          <div className="max-w-prose break-words rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all duration-200">
                            {m.content}
                          </div>

                          {reactions && reactions.size > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Array.from(reactions.entries()).map(([userId, reaction]) => (
                                <span
                                  key={userId}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium"
                                >
                                  {reaction}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && currentCommunity && !isSwitchingCommunity && !accessNotice && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-full bg-indigo-100 p-4 mb-4">
                      <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No messages yet</h3>
                    <p className="text-slate-500 max-w-md">Start the conversation! Send the first message to this community.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message Composer - Always at bottom */}
          {currentCommunity && !accessNotice && (
            <div className="sticky bottom-0 z-10 border-t border-slate-200/60 bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg shrink-0">
              <form onSubmit={handleSendMessage} className="relative mx-auto max-w-4xl">
                <div className="flex items-end gap-2">
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-200"
                      onClick={() => setShowEmojiPicker((s) => !s)}
                      aria-label="Emoji"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Button>

                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute bottom-14 left-0 z-30 shadow-2xl rounded-xl overflow-hidden">
                        <EmojiPicker
                          onEmojiClick={(e) => {
                            setNewMessage((prev) => prev + e.emoji);
                            setShowEmojiPicker(false);
                            messageInputRef.current?.focus();
                          }}
                          theme="light"
                          skinTonesDisabled
                          searchPlaceholder="Search emojis..."
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 relative">
                    <Input
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTypingIndicator();
                      }}
                      placeholder={`Message ${currentCommunity.name}...`}
                      className="pr-12 bg-white border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 text-sm"
                      disabled={isSwitchingCommunity}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 shrink-0"
                    disabled={!newMessage.trim() || isSwitchingCommunity}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* RIGHT PANEL (Desktop Members) */}
        {showMembers && (
          <aside className="hidden lg:flex w-80 shrink-0 border-l border-slate-200/60 bg-white/95 backdrop-blur-md flex-col">
            <div className="flex-1 min-h-0 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Community Members ({members.length})
              </h3>
              <ScrollArea className="flex-1">
                <MembersList members={members} onMemberClick={openDmPanel} />
              </ScrollArea>
            </div>

            {/* DM Panel */}
            {dmPanelUser && (
              <div className="border-t border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50">
                <Card className="m-4 border-slate-200/60 shadow-sm bg-white/80 backdrop-blur-sm">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="truncate">{dmPanelUser.fullName}</span>
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                        onClick={() => setDmPanelUser(null)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>

                    <ScrollArea
                      ref={dmViewportRef}
                      className="h-64 rounded-lg bg-slate-50/50 p-2"
                    >
                      <div className="space-y-2">
                        {dmMessages.map((d, i) => (
                          <div
                            key={i}
                            className={[
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-all duration-200",
                              d.from === userId
                                ? "self-end ml-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white"
                                : "self-start bg-white text-slate-800 ring-1 ring-slate-200/50"
                            ].join(" ")}
                          >
                            <div className={[
                              "text-xs opacity-75 mb-1 font-medium",
                              d.from === userId ? "text-indigo-100" : "text-slate-500"
                            ].join(" ")}>
                              {d.senderName || (d.from === userId ? "You" : dmPanelUser.fullName)}
                            </div>
                            <div>{d.content}</div>
                          </div>
                        ))}

                        {dmMessages.length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            <svg className="h-8 w-8 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm">Start your conversation!</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <form onSubmit={sendDirectMessage} className="flex items-center gap-2">
                      <Input
                        ref={dmInputRef}
                        value={dmInput}
                        onChange={(e) => setDmInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 text-sm bg-white border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendDirectMessage();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm hover:shadow-md px-3"
                        disabled={!dmInput.trim()}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* MOBILE MEMBERS DRAWER */}
      {showMembersDrawer && (
        <div
          className="fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowMembersDrawer(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transform transition-transform duration-300 translate-x-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Members ({members.length})
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                onClick={() => setShowMembersDrawer(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <ScrollArea className="h-[calc(100%-60px)] p-4">
              <MembersList
                members={members}
                onMemberClick={(member) => {
                  setShowMembersDrawer(false);
                  openDmPanel(member);
                }}
              />
            </ScrollArea>
          </div>
        </div>
      )}

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