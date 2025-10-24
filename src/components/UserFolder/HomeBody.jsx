import { useState } from "react";
import { Search, Bell, User, MapPin, Calendar, Star, TrendingUp, Compass, Heart, Menu, X } from "lucide-react";

import "../cssFile/temp.css"
import Header from './Header'

function Body() {

    const [activeTab, setActiveTab] = useState("discover");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    const destinations = [
        { id: 1, name: "Boracay", image: "🏖️", rating: 4.8, reviews: 1240, price: "$299", location: "Philippines", dayOrNight: "night" },
        { id: 2, name: "El Nido", image: "🌴", rating: 4.9, reviews: 980, price: "$349", location: "Philippines", dayOrNight: "night" },
        { id: 3, name: "Banaue", image: "⛰️", rating: 4.7, reviews: 756, price: "$199", location: "Philippines", dayOrNight: "day" },
        { id: 4, name: "Siargao", image: "🏄", rating: 4.8, reviews: 1120, price: "$279", location: "Philippines", dayOrNight: "night" },
        { id: 5, name: "Vigan", image: "🏛️", rating: 4.6, reviews: 634, price: "$159", location: "Philippines", dayOrNight: "day" },
        { id: 6, name: "Coron", image: "🚤", rating: 4.9, reviews: 890, price: "$329", location: "Philippines", dayOrNight: "day" },
    ];

    const trendingPlaces = [
        { id: 1, name: "Chocolate Hills", type: "Natural Wonder", emoji: "🍫" },
        { id: 2, name: "Mayon Volcano", type: "Volcano", emoji: "🌋" },
        { id: 3, name: "Puerto Princesa", type: "Underground River", emoji: "🦇" },
        { id: 4, name: "Taal Volcano", type: "Active Volcano", emoji: "🌊" },
    ];

    const upcomingTrips = [
        { id: 1, destination: "Boracay", date: "Nov 15-18, 2025", status: "Confirmed" },
        { id: 2, destination: "El Nido", date: "Dec 20-25, 2025", status: "Pending" },
    ];

    return (
        <>
            <Header />
            <div className="homepage" role="Body">
                <section className="hero">
                    <div className="hero-content">
                        <h1 className="hero-title">Discover Your Next Adventure</h1>
                        <p className="hero-subtitle">Explore breathtaking destinations and create unforgettable memories</p>

                        <div className="search-bar">
                            <div className="search-input-group">
                                <MapPin size={20} className="search-icon" />
                                <input type="text" placeholder="Where do you want to go?" className="search-input" />
                            </div>
                            <div className="search-input-group">
                                <Calendar size={20} className="search-icon" />
                                <input type="text" placeholder="Select dates" className="search-input" />
                            </div>
                            <button className="search-btn">
                                <Search size={20} />
                                <span>Search</span>
                            </button>
                        </div>
                    </div>
                </section>

                <main className="main-content">
                    <div className="container">
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === "discover" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("discover")}
                            >
                                Destination
                            </button>
                            <button
                                className={`tab ${activeTab === "trips" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("trips")}
                            >
                                Services
                            </button>
                            <button
                                className={`tab ${activeTab === "favorites" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("favorites")}
                            >
                                Expiriences
                            </button>
                        </div>

                        {activeTab === "discover" && (
                            <>
                                <section className="section">
                                    <div className="section-header">
                                        <h2 className="section-title">
                                            <Star size={24} />
                                            Popular Destinations
                                        </h2>
                                        <a href="#" className="see-all">See all</a>
                                    </div>
                                    <div className="destinations-grid">
                                        {destinations.map(dest => (
                                            <div
                                                key={dest.id}
                                                className="destination-card"
                                                onClick={() => { setSelectedDest(dest); setShowDetail(true); }}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <div className="destination-image">
                                                    <div className="destination-emoji">{dest.image}
                                                    </div>
                                                    <button
                                                        className="favorite-btn"
                                                        onClick={(e) => { e.stopPropagation(); /* handle favorite */ }}
                                                    >
                                                        <Heart size={20} />
                                                    </button>
                                                </div>
                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{dest.name}</h3>
                                                        <span className="destination-price">{dest.price}/{dest.dayOrNight}</span>
                                                    </div>
                                                    <p className="destination-location">
                                                        <MapPin size={14} />
                                                        {dest.location}
                                                    </p>
                                                    <div className="destination-footer">
                                                        <div className="rating">
                                                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                                            <span>{dest.rating}</span>
                                                            <span className="reviews">({dest.reviews})</span>
                                                        </div>
                                                        <button
                                                            className="explore-btn"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedDest(dest); setShowDetail(true); }}
                                                        >
                                                            Explore
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === "trips" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Calendar size={24} />
                                        Upcoming Trips
                                    </h2>
                                </div>
                                <div className="trips-list">
                                    {upcomingTrips.map(trip => (
                                        <div key={trip.id} className="trip-card">
                                            <div className="trip-info">
                                                <h3 className="trip-destination">{trip.destination}</h3>
                                                <p className="trip-date">{trip.date}</p>
                                            </div>
                                            <span className={`trip-status ${trip.status.toLowerCase()}`}>
                                                {trip.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button className="plan-trip-btn">Plan a New Trip</button>
                            </section>
                        )}

                        {activeTab === "favorites" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Heart size={24} />
                                        Saved Destinations
                                    </h2>
                                </div>
                                <div className="empty-state">
                                    <Heart size={64} className="empty-icon" />
                                    <h3>No favorites yet</h3>
                                    <p>Start exploring and save your favorite destinations</p>
                                    <button className="explore-btn-large">Explore Destinations</button>
                                </div>
                            </section>
                        )}
                    </div>
                </main>

                {showDetail && selectedDest && (
                    <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setShowDetail(false)} aria-label="Close detail">
                                <X />
                            </button>
                            <div className="modal-content">
                                <div className="modal-image">{selectedDest.image}</div>
                                <div className="modal-body">
                                    <h2 className="modal-title">{selectedDest.name} <span className="modal-price">{selectedDest.price}/{selectedDest.dayOrNight}</span></h2>
                                    <p className="modal-location"><MapPin size={14} /> {selectedDest.location}</p>
                                    <div className="modal-rating">
                                        <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                        <span>{selectedDest.rating}</span>
                                        <span className="reviews">({selectedDest.reviews} reviews)</span>
                                    </div>
                                    <p className="modal-description">This is a brief description for {selectedDest.name}. Replace with real content from your backend or Firestore document. Include amenities, host info, cancellation policy, and images for a richer view.</p>
                                    <div className="modal-actions">
                                        <button className="book-btn">Book Now</button>
                                        <button className="close-btn" onClick={() => setShowDetail(false)}>Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
export default Body;