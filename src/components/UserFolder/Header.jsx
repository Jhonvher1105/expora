import React, { useState, useEffect } from "react";
import { Bell, User, Menu, Copy, MessageCircleMore } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useChat } from "../../context/ChatContext";
import {
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    addDoc,
} from "firebase/firestore";

import logo from "../pic/logo.png";
import "../cssFile/temp.css";
import "../cssFile/chat.css";
import XIcon from "../pic/icon/x.svg";
import AddProperty from "../ui/AddProperty";
import HostingType from "../ui/HostingType";

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
            // Generate or load coupon from Firestore
            const loadOrCreateCoupon = async () => {
                if (!currentUser) return;
                
                try {
                    // Check if user already has an active coupon
                    const q = query(
                        collection(db, "coupons"),
                        where("userId", "==", currentUser.uid),
                        where("status", "==", "active")
                    );
                    const snap = await getDocs(q);
                    
                    if (!snap.empty) {
                        // Use existing coupon
                        const existing = snap.docs[0].data();
                        setVoucher({
                            code: existing.code,
                            discount: existing.type === "percentage" ? `${existing.value}% OFF` : `₱${existing.value} OFF`,
                            description: existing.description || "Use this code on your next booking",
                            expiresAt: existing.endDate?.toDate()?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        });
                    } else {
                        // Create new coupon
                        const code = `EXPORA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 7);
                        
                        const couponData = {
                            code,
                            userId: currentUser.uid,
                            type: "percentage",
                            value: 20,
                            maxDiscount: null,
                            description: "Use this code on your next booking",
                            startDate: serverTimestamp(),
                            endDate: expiresAt,
                            status: "active",
                            createdAt: serverTimestamp(),
                        };
                        
                        await addDoc(collection(db, "coupons"), couponData);
                        
                        setVoucher({
                            code,
                            discount: "20% OFF",
                            description: couponData.description,
                            expiresAt: expiresAt.toISOString(),
                        });
                    }
                } catch (e) {
                    console.error("Error loading coupon:", e);
                    // Fallback to local generation
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
            };
            
            loadOrCreateCoupon();
        }
    }, [showCoupon, currentUser]);

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

    // Chat system - use context
    const { openChat } = useChat();

    const handleOpenChat = () => {
        if (!currentUser) {
            alert("Please log in to use chat.");
            return;
        }
        openChat();
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
                    <button className="icon-btn" onClick={handleOpenChat}>
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
                                <Link to="/HostPage" id="becomeHostBtn" className="user-menu-item" role="menuitem">
                                    Become a host
                                </Link>
                                <Link to="/Settings" className="user-menu-item" role="menuitem">
                                    Settings
                                </Link>
                                <Link to="/MyBooking" className="user-menu-item" role="menuitem">
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
                        <HostingType onClose={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
