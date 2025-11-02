import React, { useState, useEffect } from "react";
import { Bell, User, Menu, Copy, MessageCircleMore, X, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    where,
    addDoc,
    getDocs,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import logo from "../pic/logo.png";
import "../cssFile/temp.css";
import XIcon from "../pic/icon/x.svg";
import AddProperty from "../ui/AddProperty";

function Header() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Coupon state
    const [showCoupon, setCoupon] = useState(false);
    const [voucher, setVoucher] = useState(null);
    const [copied, setCopied] = useState(false);

    // Chat system
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatList, setChatList] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // 🔍 User search
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    const [showHostForm, setShowForm] = useState(false);

    // ---------------------------
    // 🔹 AUTH STATE
    // ---------------------------
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
        return unsub;
    }, []);

    // ---------------------------
    // 🔹 VOUCHER SYSTEM
    // ---------------------------
    useEffect(() => {
        if (showCoupon) {
            setCopied(false);
            const code = `EXPORA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            setVoucher({
                code,
                discount: "20% OFF",
                description: "Use this code on your next booking",
                expiresAt: expiresAt.toISOString(),
            });
        }
    }, [showCoupon]);

    const copyVoucher = async () => {
        if (!voucher) return;
        await navigator.clipboard.writeText(voucher.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const applyVoucher = () => {
        localStorage.setItem("appliedVoucher", JSON.stringify(voucher));
        alert(`Voucher ${voucher.code} applied!`);
        setCoupon(false);
        navigate("/bookings");
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserMenuOpen(false);
            setShowLogoutConfirm(false);
            navigate("/LogIn");
        } catch {
            alert("Logout failed.");
        }
    };

    const openFavorites = () => {
        localStorage.setItem("openTab", "favorites");
        navigate("/FavPage");
        setUserMenuOpen(false);
    };

    // ---------------------------
    // 💬 CHAT SYSTEM
    // ---------------------------
    const openChat = async () => {
        if (!currentUser) return alert("Please log in to use chat.");
        setShowChatModal(true);
        loadUserChats();
    };

    // Load user’s existing chats
    const loadUserChats = async () => {
        const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
        const snap = await getDocs(q);
        const chats = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setChatList(chats);
    };

    // Open existing chat room
    const openChatRoom = (chat) => {
        setActiveChat(chat);
        const q = query(collection(db, "chats", chat.id, "messages"), orderBy("createdAt", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map((d) => d.data()));
        });
        return unsub;
    };

    // Send message
    const sendMessage = async () => {
        if (!newMessage.trim() || !activeChat) return;
        await addDoc(collection(db, "chats", activeChat.id, "messages"), {
            from: currentUser.uid,
            text: newMessage,
            createdAt: serverTimestamp(),
        });
        await setDoc(
            doc(db, "chats", activeChat.id),
            { lastMessage: newMessage, updatedAt: serverTimestamp() },
            { merge: true }
        );
        setNewMessage("");
    };

    // 🔍 Search for users to chat with
    const handleSearchUsers = async () => {
        if (!searchQuery.trim()) return;
        const q = query(
            collection(db, "users"),
            where("email", ">=", searchQuery),
            where("email", "<=", searchQuery + "\uf8ff")
        );
        const snap = await getDocs(q);
        const results = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((u) => u.id !== currentUser.uid);
        setSearchResults(results);
    };

    // Start new chat
    const startNewChat = async (otherUser) => {
        if (!otherUser || !currentUser) return;
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("members", "array-contains", currentUser.uid));
        const snap = await getDocs(q);

        let existing = snap.docs.find((d) => d.data().members.includes(otherUser.id));
        if (existing) {
            openChatRoom({ id: existing.id, ...existing.data() });
        } else {
            const newChatRef = await addDoc(chatsRef, {
                members: [currentUser.uid, otherUser.id],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            loadUserChats();
            setActiveChat({ id: newChatRef.id, members: [currentUser.uid, otherUser.id] });
        }
        setSearchResults([]);
        setSearchQuery("");
    };

    // ---------------------------
    // RENDER
    // ---------------------------
    return (
        <header className="header">
            <div className="header-container">
                <Link className="header-left" to={"/Home"}>
                    <img src={logo} width={40} height={40} alt="Expora logo" />
                    <span className="logo-text">Explora</span>
                </Link>

                <div className="header-right">
                    {/* 💬 Chat Button */}
                    <button className="icon-btn" onClick={openChat}>
                        <MessageCircleMore size={20} />
                    </button>

                    {/* 👤 User Menu */}
                    <div style={{ position: "relative" }}>
                        <button
                            className="icon-btn"
                            onClick={() => setUserMenuOpen((s) => !s)}
                            aria-haspopup="menu"
                            aria-expanded={userMenuOpen}
                        >
                            <User size={20} />
                        </button>

                        {userMenuOpen && (
                            <div className="user-menu" role="menu" aria-label="User menu">
                                {currentUser ? (
                                    <p className="user-menu-item" aria-hidden>{currentUser.email}</p>
                                ) : (
                                    <p className="user-email">Not signed in</p>
                                )}
                                <Link to="/Profile" className="user-menu-item" role="menuitem">
                                    My Profile
                                </Link>
                                <button type="button" id="becomeHostBtn" className="user-menu-item" role="menuitem" onClick={() => setShowForm(true)} >
                                    Become a host
                                </button>
                                <Link to="/Settings" className="user-menu-item" role="menuitem">
                                    Settings
                                </Link>
                                <Link to="/Settings" className="user-menu-item" role="menuitem">
                                    My booking
                                </Link>
                                <button className="user-menu-item" onClick={openFavorites}>
                                    Favorites
                                </button>
                                <button className="user-menu-item" onClick={() => setCoupon(true)} type="button" role="menuitem">
                                    Coupons
                                </button>
                                <button className="user-menu-item" type="button" role="menuitem">
                                    E-Wallet
                                </button>
                                <button className="user-menu-item" onClick={() => alert("Coming soon")}>
                                    Suggestions
                                </button>
                                <div className="user-menu-divider" />
                                <Link to="/help" className="user-menu-item" role="menuitem">
                                    Help & Support
                                </Link>
                                <div className="user-menu-divider" />
                                <button className="user-menu-item logout" onClick={() => setShowLogoutConfirm(true)}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showHostForm && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add property form">
                    <div className="modal host-modal" onClick={e => e.stopPropagation()}>
                        <AddProperty
                            onClose={() => setShowForm(false)}
                            onPropertyCreated={(data) => {
                                console.log('Property created:', data);
                                setShowForm(false);
                                // You can add a success notification here
                            }}
                        />
                        
                    </div>
                </div>
            )}

            {/* ================= Chat Modal ================= */}
            {showChatModal && (
                <div className="modal-overlay">
                    <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="chat-header">
                            <h3>Messages</h3>
                            <button onClick={() => setShowChatModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* 🔍 User Search */}
                        {!activeChat && (
                            <div className="chat-search">
                                <div className="search-bar">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search users by email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                                    />
                                    <button onClick={handleSearchUsers}>Search</button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="search-results">
                                        {searchResults.map((user) => (
                                            <div
                                                key={user.id}
                                                className="user-result"
                                                onClick={() => startNewChat(user)}
                                            >
                                                <span>{user.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Existing Chats */}
                        {!activeChat && (
                            <div className="chat-list">
                                {chatList.length > 0 ? (
                                    chatList.map((chat) => (
                                        <div key={chat.id} className="chat-item" onClick={() => openChatRoom(chat)}>
                                            <strong>Chat with:</strong>{" "}
                                            {chat.members.filter((m) => m !== currentUser.uid).join(", ")}
                                            <p className="last-message">{chat.lastMessage || "No messages yet"}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p>No chats yet</p>
                                )}
                            </div>
                        )}

                        {/* Active Chat */}
                        {activeChat && (
                            <div className="chat-room">
                                <button className="back-btn" onClick={() => setActiveChat(null)}>← Back</button>
                                <div className="messages">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`message ${msg.from === currentUser.uid ? "own" : "other"}`}
                                        >
                                            {msg.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="chat-input-area">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                    />
                                    <button onClick={sendMessage}>Send</button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </header>
    );
}

export default Header;
