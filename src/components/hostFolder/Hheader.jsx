import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, User, Menu, X, Copy, MessageCircleMore, ChevronDown, ChevronRight, UserCircle, Settings, Ticket, Lightbulb, HelpCircle, LogOut, Home, Bookmark } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
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
    const [showCoupon, setCoupon] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showHostForm, setShowForm] = useState(false);
    const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // coupon/voucher state
    const [voucher, setVoucher] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

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

    useEffect(() => {
        if (currentUser) {
            console.log('Current user UID:', currentUser.uid);
        }
    }, [currentUser]);

    const handleSwitchAccount = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please log in to switch account.");
            navigate("/LogIn");
            return;
        }

        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                role: "guest",
            });
            console.log("User role updated to guest");
            setUserMenuOpen(false);
            navigate("/Home");
        } catch (error) {
            console.error("Error updating user role:", error);
            alert("Failed to update role. Please try again.");
        }
    };

    const openGuestWishlist = () => {
        navigate("/HostGuestWishlist");
        setUserMenuOpen(false);
    };
    
    return (
        <header className="header" role="banner">
            <div className="header-container">
                {/* ✅ Left Section (Logo + Brand) */}
                <Link className="header-left" to={'/HostPage'}>
                    <img src={logo} width={40} height={40} alt="Expora logo" />
                    <span className="logo-text">Explora</span>
                </Link>

                {/* ✅ Right Section */}
                <div className="header-right">
                    {/* User Menu */}
                    <div style={{ position: "relative" }} ref={userMenuRef}>
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
                                        to="/Home" 
                                        id="becomeHostBtn" 
                                        className="user-menu-item" 
                                        role="menuitem"
                                        onClick={handleSwitchAccount}
                                    >
                                        <Home size={18} />
                                        <span>Switch Account</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </Link>
                                    <div style={{ position: "relative" }}>
                                        <button
                                            className="user-menu-item"
                                            onClick={() => setSettingsSubmenuOpen(!settingsSubmenuOpen)}
                                            role="menuitem"
                                            type="button"
                                        >
                                            <Settings size={18} />
                                            <span>Settings</span>
                                            {settingsSubmenuOpen ? (
                                                <ChevronDown size={16} className="menu-arrow" />
                                            ) : (
                                                <ChevronRight size={16} className="menu-arrow" />
                                            )}
                                        </button>
                                        {settingsSubmenuOpen && (
                                            <div className="user-submenu" style={{ marginLeft: "1rem", paddingLeft: "0.5rem", borderLeft: "2px solid rgba(255, 255, 255, 0.2)" }}>
                                                <Link
                                                    to="/HostSettings"
                                                    className="user-menu-item"
                                                    role="menuitem"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    style={{ fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                                >
                                                    <Settings size={16} />
                                                    <span>Settings</span>
                                                </Link>
                                                <Link
                                                    to="/HostProfile"
                                                    className="user-menu-item"
                                                    role="menuitem"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    style={{ fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                                >
                                                    <UserCircle size={16} />
                                                    <span>My Profile</span>
                                                </Link>
                                                <Link
                                                    to="/HostBooking"
                                                    className="user-menu-item"
                                                    role="menuitem"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    style={{ fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                                >
                                                    <ChevronRight size={16} />
                                                    <span>Bookings</span>
                                                </Link>
                                                <Link
                                                    to="/WalletPage"
                                                    className="user-menu-item"
                                                    role="menuitem"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    style={{ fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                                >
                                                    <ChevronRight size={16} />
                                                    <span>E-Wallet</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
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
                                        type="button" 
                                        role="menuitem"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <Lightbulb size={18} />
                                        <span>Suggestions</span>
                                        <ChevronRight size={16} className="menu-arrow" />
                                    </button>
                                    <button 
                                        className="user-menu-item" 
                                        type="button" 
                                        role="menuitem"
                                        onClick={() => { openGuestWishlist(); setUserMenuOpen(false); }}
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
                                <img src={XIcon} alt="X"/>
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

            {/* Become Host Form */}
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
        </header>
    );
}

export default Header;
