import { useState } from "react";
import { Search, Bell, User, MapPin, Calendar, Star, TrendingUp, Compass, Heart, Menu, X } from "lucide-react";

import '../cssFile/temp.css'

function Header(){

    const [menuOpen, setMenuOpen] = useState(false);

    return<header className="header">
                <div className="header-container">
                    <div className="header-left">
                        <div className="logo">
                            <Compass size={28} />
                            <span className="logo-text">Expora</span>
                        </div>
                    </div>

                    <nav className={`nav ${menuOpen ? "nav-open" : ""}`}>
                        <a href="#" className="nav-link active">Home</a>
                        <a href="#" className="nav-link">Destinations</a>
                        <a href="#" className="nav-link">My Trips</a>
                        <a href="#" className="nav-link">Bookings</a>
                    </nav>

                    <div className="header-right">
                        <button className="icon-btn">
                            <Bell size={20} />
                            <span className="notification-badge">3</span>
                        </button>
                        <button className="icon-btn">
                            <User size={20} />
                        </button>
                        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>
}
export default Header;