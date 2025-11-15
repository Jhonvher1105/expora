import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, User, Menu, Copy, MessageCircleMore, Settings, Heart, Ticket, Lightbulb, HelpCircle, LogOut, Home, ChevronRight, UserCircle, Building2, Sparkles, Bookmark, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
    doc,
    updateDoc,
    getDoc,
    setDoc,
} from "firebase/firestore";

import logo from "../pic/logo.png";
import "../cssFile/temp.css";
import "../cssFile/chat.css";
import XIcon from "../pic/icon/x.svg";
import AddProperty from "../ui/AddProperty";
import HostingType from "../ui/HostingType";

function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isHost, setIsHost] = useState(false);

    // Coupon state
    const [showCoupon, setCoupon] = useState(false);
    const [voucher, setVoucher] = useState(null);
    const [copied, setCopied] = useState(false);

    // Wishlist preferences state
    const [showWishlistPreferences, setShowWishlistPreferences] = useState(false);
    const [preferences, setPreferences] = useState("");

    const [showHostForm, setShowForm] = useState(false);
    const userMenuRef = useRef(null);

    // ---------------------------
    // 🔹 AUTH STATE
    // ---------------------------
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (users) => setCurrentUser(users));
        return unsub;
    }, []);

    // ---------------------------
    // 🔹 CHECK IF USER IS HOST
    // ---------------------------
    useEffect(() => {
        const checkHostRole = async () => {
            if (!currentUser) {
                setIsHost(false);
                return;
            }

            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setIsHost(userData.role === "host" || userData.accType === "host");
                } else {
                    setIsHost(false);
                }
            } catch (error) {
                console.error("Error checking host role:", error);
                setIsHost(false);
            }
        };

        checkHostRole();
    }, [currentUser]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        if (userMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [userMenuOpen]);

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

    const openSuggestions = () => {
        navigate("/SuggestionsPage");
        setUserMenuOpen(false);
    };

    const openWishlist = () => {
        setUserMenuOpen(false);
        setShowWishlistPreferences(true);
    };

    const handleSavePreferences = async () => {
        if (!currentUser) {
            alert("Please log in to save your preferences.");
            navigate("/LogIn", { state: { from: location.pathname } });
            return;
        }

        // If preferences are empty, just close the modal
        if (!preferences.trim()) {
            setShowWishlistPreferences(false);
            setPreferences("");
            return;
        }

        try {
            // Save preferences to Firestore
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    wishlistPreferences: preferences.trim(),
                    preferencesUpdatedAt: serverTimestamp(),
                });
            } else {
                // Create user document if it doesn't exist
                await setDoc(userRef, {
                    wishlistPreferences: preferences.trim(),
                    preferencesUpdatedAt: serverTimestamp(),
                });
            }

            setShowWishlistPreferences(false);
            setPreferences("");
        } catch (error) {
            console.error("Error saving preferences:", error);
            alert("Failed to save preferences. Please try again.");
        }
    };

    const handleBecomeHost = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please log in to become a host.");
            navigate("/LogIn", { state: { from: location.pathname } });
            return;
        }

        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                role: "host",
            });
            console.log("User role updated to host");
            setUserMenuOpen(false);
            navigate("/HostPage");
        } catch (error) {
            console.error("Error updating user role:", error);
            alert("Failed to update role. Please try again.");
        }
    };

    // Chat system - use context
    const { openChat } = useChat();

    const handleOpenChat = () => {
        if (!currentUser) {
            alert("Please log in to use chat.");
            // Navigate to login page with current location preserved
            setTimeout(() => {
                navigate("/LogIn", { state: { from: location.pathname } });
            }, 500);
            return;
        }
        openChat();
    };

    const handleUserMenuClick = () => {
        if (!currentUser) {
            alert("Please log in to access your account.");
            // Navigate to login page with current location preserved
            setTimeout(() => {
                navigate("/LogIn", { state: { from: location.pathname } });
            }, 500);
            return;
        }
        setUserMenuOpen((s) => !s);
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
                            onClick={handleUserMenuClick}
                            aria-haspopup="menu"
                            aria-expanded={userMenuOpen}
                        >
                            <User size={20} />
                        </button>

                        {userMenuOpen && (
                            <div className="user-menu" role="menu" aria-label="User menu">
                                {/* User Profile Section */}
                                <div className="user-menu-header">
                                    <div className="user-avatar">
                                        <UserCircle size={40} />
                                    </div>
                                    <div className="user-info">
                                        {currentUser ? (
                                            <>
                                                <div className="user-name">
                                                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                                                </div>
                                                <div className="user-email-text">{currentUser.email}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="user-name">Guest</div>
                                                <div className="user-email-text">Not signed in</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="user-menu-divider" />
                                
                                {/* Menu Items */}
                                <div className="user-menu-items">
                                    <Link 
                                        to="/HostPage" 
                                        id="becomeHostBtn" 
                                        className="user-menu-item" 
                                        role="menuitem"
                                        onClick={handleBecomeHost}
                                    >
                                        <Building2 size={18} />
                                        <span>Become a host</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </Link>
                                    <Link 
                                        to="/Settings" 
                                        className="user-menu-item" 
                                        role="menuitem"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <Settings size={18} />
                                        <span>Settings</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </Link>
                                    <button 
                                        className="user-menu-item" 
                                        onClick={() => { openFavorites(); setUserMenuOpen(false); }}
                                        type="button" 
                                        role="menuitem"
                                    >
                                        <Heart size={18} />
                                        <span>Favorites</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </button>
                                    <button 
                                        className="user-menu-item" 
                                        onClick={() => { setCoupon(true); setUserMenuOpen(false); }} 
                                        type="button" 
                                        role="menuitem"
                                    >
                                        <Ticket size={18} />
                                        <span>Coupons</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </button>
                                    <button 
                                        className="user-menu-item" 
                                        onClick={() => { openSuggestions(); setUserMenuOpen(false); }}
                                        type="button" 
                                        role="menuitem"
                                    >
                                        <Lightbulb size={18} />
                                        <span>Suggestions</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </button>
                                    <button 
                                        className="user-menu-item" 
                                        onClick={() => { openWishlist(); setUserMenuOpen(false); }}
                                        type="button" 
                                        role="menuitem"
                                    >
                                        <Bookmark size={18} />
                                        <span>Wishlist</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </button>
                                </div>
                                
                                <div className="user-menu-divider" />
                                
                                {/* Support Section */}
                                <div className="user-menu-items">
                                    <Link 
                                        to="/help" 
                                        className="user-menu-item" 
                                        role="menuitem"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <HelpCircle size={18} />
                                        <span>Help & Support</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </Link>
                                </div>
                                
                                <div className="user-menu-divider" />
                                
                                {/* Logout */}
                                <div className="user-menu-items">
                                    <button 
                                        className="user-menu-item logout" 
                                        onClick={() => { setShowLogoutConfirm(true); setUserMenuOpen(false); }}
                                        type="button"
                                        role="menuitem"
                                    >
                                        <LogOut size={18} />
                                        <span>Logout</span>
                                    </button>
                                </div>
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

            {showLogoutConfirm && createPortal(
                <div className="modal-overlay logout-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal logout-modal" onClick={e => e.stopPropagation()}>
                        <div className="logout-modal-content">
                            <div className="logout-modal-icon">
                                <LogOut size={48} />
                            </div>
                            <h3 className="logout-modal-title">Confirm Logout</h3>
                            <p className="logout-modal-message">Are you sure you want to log out? You'll need to sign in again to access your account.</p>
                            <div className="logout-modal-buttons">
                                <button 
                                    className="logout-confirm-btn" 
                                    onClick={handleLogout}
                                >
                                    Yes, Log Out
                                </button>
                                <button 
                                    className="logout-cancel-btn"
                                    onClick={() => setShowLogoutConfirm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showWishlistPreferences && createPortal(
                <div className="modal-overlay logout-modal-overlay" onClick={() => { setShowWishlistPreferences(false); setPreferences(""); }}>
                    <div className="modal logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
                        <div className="logout-modal-content">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <div className="logout-modal-icon" style={{ marginBottom: "0" }}>
                                    <Bookmark size={48} />
                                </div>
                                <button
                                    onClick={() => { setShowWishlistPreferences(false); setPreferences(""); }}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.1)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)",
                                        borderRadius: "50%",
                                        width: "36px",
                                        height: "36px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        color: "#ffffff",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = "rgba(255, 255, 255, 0.2)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = "rgba(255, 255, 255, 0.1)";
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <h3 className="logout-modal-title">What do you like?</h3>
                            <p className="logout-modal-message" style={{ marginBottom: "20px" }}>
                                Tell us about your preferences, interests, or things you'd like to add to your wishlist. 
                                This helps us personalize your experience!
                            </p>
                            <textarea
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                                placeholder="For example: Beach destinations, mountain hikes, luxury hotels, adventure activities, spa treatments, local cuisine..."
                                style={{
                                    width: "100%",
                                    minHeight: "150px",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    fontFamily: "inherit",
                                    resize: "vertical",
                                    marginBottom: "20px",
                                    outline: "none",
                                    transition: "all 0.2s ease"
                                }}
                                onFocus={(e) => {
                                    e.target.style.border = "1px solid rgba(255, 107, 53, 0.5)";
                                    e.target.style.background = "rgba(255, 255, 255, 0.08)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                                    e.target.style.background = "rgba(255, 255, 255, 0.05)";
                                }}
                            />
                            <div className="logout-modal-buttons" style={{ display: "flex", gap: "12px" }}>
                                <button 
                                    className="logout-confirm-btn" 
                                    onClick={handleSavePreferences}
                                    style={{ flex: 1 }}
                                >
                                    Save Preferences
                                </button>
                                <button 
                                    className="logout-cancel-btn"
                                    onClick={() => { 
                                        setShowWishlistPreferences(false); 
                                        setPreferences("");
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    Skip
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </header>
    );
}

export default Header;
