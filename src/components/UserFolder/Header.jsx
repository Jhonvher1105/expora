import React, { useState, useEffect } from "react";
import { Bell, User, Menu, Copy, MessageCircleMore } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import logo from "../pic/logo.png";
import AddProperty from "../ui/AddProperty.jsx";
import "../cssFile/temp.css";

import X from "../pic/icon/x.svg";


function Header() {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showCoupon, setCoupon] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showHostForm, setShowForm] = useState(false);

    // coupon/voucher state
    const [voucher, setVoucher] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // generate a voucher when coupon modal opens
    useEffect(() => {
        if (showCoupon) {
            // generate simple voucher if none or expired
            setCopied(false);
            setVoucher((prev) => {
                if (prev && new Date(prev.expiresAt) > new Date()) return prev;
                const code = generateVoucherCode();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity
                return {
                    code,
                    discount: "20% OFF",
                    description: "Use this code on your next booking",
                    expiresAt: expiresAt.toISOString(),
                };
            });
        }
    }, [showCoupon]);

    const generateVoucherCode = () => {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `EXPORA-${rand}`;
    };

    const copyVoucher = async () => {
        if (!voucher) return;
        try {
            await navigator.clipboard.writeText(voucher.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
            alert("Couldn't copy to clipboard. Please copy manually: " + voucher.code);
        }
    };

    const applyVoucher = () => {
        if (!voucher) return;
        // Store applied voucher locally — your booking flow can read this
        try {
            localStorage.setItem("appliedVoucher", JSON.stringify(voucher));
            alert(`Voucher ${voucher.code} applied.`);
            setCoupon(false);
            // optionally navigate to bookings or cart
            navigate("/bookings");
        } catch (err) {
            console.error(err);
            alert("Failed to apply voucher.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserMenuOpen(false);
            setMenuOpen(false);
            setShowLogoutConfirm(false);
            navigate("/LogIn");
        } catch (err) {
            console.error("Logout failed:", err);
            alert("Failed to logout. Please try again.");
        }
    };

    const chatBtn = () =>{
        setShowChat(true)
    }

    return (
        <header className="header" role="banner">
            <div className="header-container">
                {/* ✅ Left Section (Logo + Brand) */}
                <Link className="header-left" to={'/Home'}>
                    <img src={logo} width={40} height={40} alt="Expora logo" />
                    <span className="logo-text">Explora</span>
                </Link>

                {/* ✅ Right Section */}
                <div className="header-right">
                    <button className="icon-btn" 
                    aria-label="Chat"
                    >
                        <MessageCircleMore size={20} />
                        <span className="notification-badge" aria-hidden="true">
                            {currentUser ? 3 : 0}
                        </span>
                    </button>

                    {/* Chat */}
                    <div style={{ position: "relative" }}>
                        <header>
                            
                        </header>
                    </div>
                    {/* User Menu */}
                    <div style={{ position: "relative" }}>
                        <button
                            className="icon-btn"
                            onClick={() => setUserMenuOpen((s) => !s)}
                            aria-haspopup="menu"
                            aria-expanded={userMenuOpen}
                            aria-label="User menu"
                            type="button"
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
                                <button type="button" className="user-menu-item" role="menuitem" onClick={() => setShowForm(true)}>
                                    Become a host
                                </button>
                                <Link to="/Settings" className="user-menu-item" role="menuitem">
                                    Settings
                                </Link>
                                <Link to="/Settings" className="user-menu-item" role="menuitem">
                                    My booking
                                </Link>
                                <button className="user-menu-item" onClick={() => setCoupon(true)} type="button" role="menuitem">
                                    Coupons
                                </button>
                                <button className="user-menu-item" type="button" role="menuitem">
                                    E-Wallet
                                </button>
                                <button className="user-menu-item" type="button" role="menuitem">
                                    Suggestion and Recommendation
                                </button>
                                <div className="user-menu-divider" />
                                <Link to="/help" className="user-menu-item" role="menuitem">
                                    Help & Support
                                </Link>
                                <div className="user-menu-divider" />
                                <button
                                    className="user-menu-item logout"
                                    onClick={() => setShowLogoutConfirm(true)}
                                    role="menuitem"
                                    type="button"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ✅ Hamburger Menu (Mobile) */}
                    <button
                        className="menu-btn"
                        onClick={() => setMenuOpen((s) => !s)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        type="button"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* coupon modal */}
            {showCoupon && voucher && (
                <div className="coupon_modal-overlay" role="dialog" aria-modal="true" aria-label="Coupon modal">
                    <div className="modal coupon-modal">
                        <section className="coupon_modal_header">
                            <h3>Your Voucher</h3>
                            <button className="coupon_X_Btn" onClick={() => setCoupon(false)} aria-label="Close coupon">
                                <X size={20} />
                            </button>
                        </section>

                        <main className="coupon-modal-main">
                            <div className="coupon-card">
                                <div className="coupon-discount">{voucher.discount}</div>
                                <div className="coupon-description">{voucher.description}</div>

                                <div className="coupon-code-container">
                                    <div className="coupon-code">{voucher.code}</div>
                                    <button className="icon-btn" onClick={copyVoucher} aria-label="Copy voucher">
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <div className="coupon-expiry">
                                    Expires: {new Date(voucher.expiresAt).toLocaleDateString()}
                                </div>

                                <div className="coupon-actions">
                                    <button onClick={applyVoucher} className="editBtn">Apply Voucher</button>
                                    <button onClick={() => setCoupon(false)} className="cancel-btn">Close</button>
                                </div>

                                {copied && <div className="copy-success">Copied!</div>}
                            </div>
                        </main>
                    </div>
                </div>
            )}

            {/* logout confirmation modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Logout</h3>
                        <p>Are you sure you want to log out?</p>
                        <div className="modal-buttons">
                            <button className="confirm-btn" onClick={handleLogout}>
                                Yes, Log Out
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Become Host Form */}
            {showHostForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <AddProperty onPropertyCreated={() => setShowForm(false)} />
                        <button className="cancel-btn" onClick={() => setShowForm(false)} style={{marginTop:8}}>Close</button>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
