import { useState, useEffect } from "react";
import { Bell, User, Menu, X, } from "lucide-react";

import "../cssFile/temp.css";
import logo from "../pic/logo.png";
import Login from '../../login2/LogIn2'

// Firebase + Router imports
import { auth } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

function Header() {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // ✅ Track signed-in user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // ✅ Handle logout with confirmation
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

    return (
        <header className="header" role="banner">
            <div className="header-container">
                {/* ✅ Left Section (Logo + Brand) */}
                <div className="header-left">

                    <img src={logo} width={40} height={40} alt="Expora logo" />
                    <span className="logo-text">Expora</span>

                </div>

                {/* ✅ Main Navigation */}
                {/* <nav className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
                    <Link to="/" className="nav-link active">
                        Home
                    </Link>
                    <Link to="/destinations" className="nav-link">
                        Destinations
                    </Link>
                    <Link to="/trips" className="nav-link">
                        My Trips
                    </Link>
                    <Link to="/bookings" className="nav-link">
                        Bookings
                    </Link>
                </nav> */}

                {/* ✅ Right Section */}
                <div className="header-right">
                    <button className="icon-btn" aria-label="Notifications">
                        <Bell size={20} />
                        <span className="notification-badge" aria-hidden="true">
                            {currentUser ? 3 : 0}
                        </span>
                    </button>

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
                                    <p className="user-menu-item">{currentUser.email}</p>
                                ) : (
                                    <p className="user-email">Not signed in</p>
                                )}
                                <Link to="/Profile" className="user-menu-item" role="menuitem">
                                    My Profile
                                </Link>
                                <Link to="/settings" className="user-menu-item" role="menuitem">
                                    Settings
                                </Link>
                                <Link to="/bookings" className="user-menu-item" role="menuitem">
                                    My Bookings
                                </Link>
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

            {/* ✅ Logout Confirmation Modal */}
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
        </header>
    );
}

export default Header;
