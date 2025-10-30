import React, { useState, useEffect } from "react";
import { Bell, User, Menu, Copy, MessageCircleMore, X } from "lucide-react";
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

    // Coupons
    const [showCoupon, setCoupon] = useState(false);
    const [voucher, setVoucher] = useState(null);
    const [copied, setCopied] = useState(false);

    // Chat
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatList, setChatList] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    const [showHostForm, setShowForm] = useState(false);

    // Listen to user
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
        return unsub;
    }, []);

    // Generate voucher
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

    // Copy voucher
    const copyVoucher = async () => {
        if (!voucher) return;
        await navigator.clipboard.writeText(voucher.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Apply voucher
    const applyVoucher = () => {
        localStorage.setItem("appliedVoucher", JSON.stringify(voucher));
        alert(`Voucher ${voucher.code} applied!`);
        setCoupon(false);
        navigate("/bookings");
    };

    // Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserMenuOpen(false);
            setShowLogoutConfirm(false);
            navigate("/LogIn");
        } catch (err) {
            alert("Logout failed.");
        }
    };

    // ✅ Open Favorites Tab
    const openFavorites = () => {
        localStorage.setItem("openTab", "favorites");
        navigate("/Home");
        setUserMenuOpen(false);
    };

    // =====================================================
    // 💬 PRIVATE CHAT SYSTEM
    // =====================================================
    const openChat = async () => {
        if (!currentUser) return alert("Please log in to use chat.");
        setShowChatModal(true);
        loadUserChats();
    };

    // Load chats where current user is a member
    const loadUserChats = async () => {
        const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
        const snap = await getDocs(q);
        const chats = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setChatList(chats);
    };

    // Load messages for selected chat
    const openChatRoom = (chat) => {
        setActiveChat(chat);
        const q = query(
            collection(db, "chats", chat.id, "messages"),
            orderBy("createdAt", "asc")
        );
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

        // update last message
        await setDoc(
            doc(db, "chats", activeChat.id),
            { lastMessage: newMessage, updatedAt: serverTimestamp() },
            { merge: true }
        );

        setNewMessage("");
    };

    // Start new chat manually (for testing)
    const startNewChat = async (otherUserId) => {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("members", "array-contains", currentUser.uid));
        const snap = await getDocs(q);

        let existing = snap.docs.find((d) => d.data().members.includes(otherUserId));
        if (existing) {
            openChatRoom({ id: existing.id, ...existing.data() });
        } else {
            const newChatRef = await addDoc(chatsRef, {
                members: [currentUser.uid, otherUserId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            loadUserChats();
        }
    };

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
                            <div className="user-menu">
                                {currentUser && <p>{currentUser.email}</p>}

                                <Link to="/Profile" className="user-menu-item">
                                    My Profile
                                </Link>
                                <button className="user-menu-item" onClick={() => setShowForm(true)}>
                                    Become a host
                                </button>
                                <button className="user-menu-item" onClick={openFavorites}>
                                    Favorites
                                </button>
                                <button className="user-menu-item" onClick={() => setCoupon(true)}>
                                    Coupons
                                </button>
                                <button className="user-menu-item" onClick={() => alert("Coming soon")}>
                                    E-Wallet
                                </button>
                                <button className="user-menu-item" onClick={() => alert("Coming soon")}>
                                    Suggestions
                                </button>
                                <div className="user-menu-divider" />
                                <button className="user-menu-item logout" onClick={() => setShowLogoutConfirm(true)}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    <button className="menu-btn" onClick={() => setMenuOpen((s) => !s)}>
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

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

                        {/* Chat List */}
                        {!activeChat && (
                            <div className="chat-list">
                                {chatList.length > 0 ? (
                                    chatList.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className="chat-item"
                                            onClick={() => openChatRoom(chat)}
                                        >
                                            <strong>Chat with: </strong>
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
                                <button
                                    className="back-btn"
                                    onClick={() => setActiveChat(null)}
                                >
                                    ← Back
                                </button>

                                <div className="messages">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`message ${msg.from === currentUser.uid ? "own" : "other"
                                                }`}
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

            {/* Coupon Modal */}
            {showCoupon && voucher && (
                <div className="coupon_modal-overlay">
                    <div className="modal coupon-modal">
                        <h3>Your Voucher</h3>
                        <p>{voucher.discount} — {voucher.description}</p>
                        <p>Code: {voucher.code}</p>
                        <button onClick={copyVoucher}>Copy</button>
                        <button onClick={applyVoucher}>Apply</button>
                        <button onClick={() => setCoupon(false)}>Close</button>
                        {copied && <div>Copied!</div>}
                    </div>
                </div>
            )}

            {/* Logout Confirm */}
            {showLogoutConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Logout</h3>
                        <button onClick={handleLogout}>Yes</button>
                        <button onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Add Property Form */}
            {showHostForm && (
                <div className="modal-overlay">
                    <div className="modal host-modal" onClick={(e) => e.stopPropagation()}>
                        <AddProperty onClose={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
