import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "../pic/logo.png";
import "../cssFile/temp.css";

export default function LandingPage() {
    const headerRef = useRef(null);

    useEffect(() => {
        const onScroll = () => {
            const header = headerRef.current;
            if (!header) return;
            if (window.scrollY > 50) header.classList.add("scrolled");
            else header.classList.remove("scrolled");
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <>
        
            <header ref={headerRef} id="header" className="landing-header">
                <div className="header-left">
                    <img src={Logo} alt="Expora / StayHub logo" width={40} height={40}/>
                    <span style={{ marginLeft: 8, fontWeight: 700, color:"orange",}}>Explora</span>
                </div>

                <div className="auth-buttons">
                    <Link to="/login" className="btn btn-login">Log In</Link>
                    <Link to="/register" className="btn btn-signup">Sign Up</Link>
                </div>
            </header>

            <main className="landing-main">
                <section className="hero">
                    <div className="hero-background" />
                    <div className="floating-shapes" aria-hidden="true">
                        <div className="shape shape-1" />
                        <div className="shape shape-2" />
                        <div className="shape shape-3" />
                    </div>

                    <div className="hero-content">
                        <h1>
                            Discover Your Perfect <span className="gradient-text">Stay</span>
                        </h1>
                        <p>
                            Connect hosts and guests seamlessly. Explore unique homes,
                            experiences, and services all in one platform.
                        </p>

                        <div className="cta-buttons">
                            <Link to="/Home" className="btn-primary">Explore Listings</Link>
                            <Link to="/Profile" className="btn-secondary">Become a Host</Link>
                        </div>
                    </div>
                </section>

                <section className="features" aria-labelledby="features-title">
                    <h2 id="features-title" style={{ textAlign: "center", color: "#fff", marginBottom: 24 }}>Features</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🏠</div>
                            <h3>Unique Homes</h3>
                            <p>Browse thousands of unique properties, from cozy apartments to luxurious villas.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">✨</div>
                            <h3>Amazing Experiences</h3>
                            <p>Discover local experiences and activities curated by passionate hosts.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🛡️</div>
                            <h3>Secure Booking</h3>
                            <p>Book with confidence using our secure payment system and verified listings.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">💰</div>
                            <h3>Best Prices</h3>
                            <p>Get access to exclusive deals, discounts, and rewards on every booking.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📱</div>
                            <h3>Easy Management</h3>
                            <p>Manage your listings, bookings, and calendar effortlessly from one dashboard.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">⭐</div>
                            <h3>Verified Reviews</h3>
                            <p>Read authentic reviews from real guests to make informed decisions.</p>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}