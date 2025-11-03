import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Star, Heart, X } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    deleteDoc,
    setDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function Body() {
    const [activeTab, setActiveTab] = useState("properties");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState("");
    const [currentUser, setCurrentUser] = useState(null);

    const upcomingTrips = [
        { id: 1, destination: "Boracay", date: "Nov 15-18, 2025", status: "Confirmed" },
        { id: 2, destination: "El Nido", date: "Dec 20-25, 2025", status: "Pending" },
    ];

    // ✅ Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // ✅ Fetch properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, activeTab));
                const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProperties(data);
                setAllProperties(data);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    // ✅ Fetch favorites
    useEffect(() => {
        if (!currentUser) return;
        const fetchFavorites = async () => {
            try {
                const favSnap = await getDocs(collection(db, "favorites"));
                const userFavs = favSnap.docs
                    .map((doc) => doc.data())
                    .filter((fav) => fav.userId === currentUser.uid);
                setFavorites(userFavs);
            } catch (error) {
                console.error("Error loading favorites:", error);
            }
        };
        fetchFavorites();
    }, [currentUser]);

    // ✅ Handle Favorite Add/Remove
    const handleFavBtn = async (property) => {
        if (!currentUser) {
            alert("Please log in to save favorites.");
            return;
        }
        if (!property) return;

        try {
            const favDocRef = doc(db, "favorites", `${currentUser.uid}_${property.id}`);
            const favDoc = await getDoc(favDocRef);

            if (favDoc.exists()) {
                await deleteDoc(favDocRef);
                alert("Removed from favorites 💔");
            } else {
                await setDoc(favDocRef, {
                    userId: currentUser.uid,
                    propertyId: property.id,
                    propertyData: property,
                    createdAt: new Date(),
                });
                alert("Added to favorites ❤️");
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    useEffect(() => {
        const tab = localStorage.getItem("openTab");
        if (tab) {
            setActiveTab(tab);
            localStorage.removeItem("openTab");
        }
    }, []);

    // ✅ Filter Search
    const handleSearch = () => {
        const filtered = allProperties.filter(
            (p) =>
                p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setProperties(filtered);
    };

    if (loading) return <p className="text-center mt-10">Loading properties...</p>;

    return (
        <>
            <Header />
            <div className="homepage" role="Body">
                {/* ================= HERO SECTION ================= */}
                <section className="hero">
                    <div className="hero-content">
                        <h1 className="hero-title">Discover Your Next Adventure</h1>
                        <p className="hero-subtitle">
                            Explore breathtaking destinations and create unforgettable memories
                        </p>

                        <div className="search-bar">
                            <div className="search-input-group">
                                <MapPin size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Where do you want to go?"
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="search-input-group">
                                <Calendar size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Select dates"
                                    className="search-input"
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                />
                            </div>
                            <button className="search-btn" onClick={handleSearch}>
                                <Search size={20} />
                                <span>Search</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* ================= MAIN CONTENT ================= */}
                <main className="main-content">
                    <div className="container">
                        {/* TABS */}
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === "properties" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("properties")}
                            >
                                Destination
                            </button>
                            <button
                                className={`tab ${activeTab === "services" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("services")}
                            >
                                Services
                            </button>
                            <button
                                className={`tab ${activeTab === "experiences" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("experiences")}
                            >
                                Experiences
                            </button>
                        </div>

                        {/* DISCOVER TAB */}
                        {activeTab === "properties" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Star size={24} />
                                        Popular Destinations
                                    </h2>
                                </div>

                                <div className="destinations-grid">
                                    {properties.length > 0 ? (
                                        properties.map((property) => (
                                            <div key={property.id} className="destination-card">
                                                <div className="destination-image">
                                                    {property.images && property.images.length > 0 ? (
                                                        <img
                                                            src={property.images[0]}
                                                            alt={property.title}
                                                            className="property-img"
                                                        />
                                                    ) : (
                                                        <div className="no-image">No Image</div>
                                                    )}
                                                    <button
                                                        className="favorite-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFavBtn(property);
                                                        }}
                                                    >
                                                        <Heart size={20} />
                                                    </button>
                                                </div>

                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{property.title}</h3>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} / night
                                                        </span>
                                                    </div>
                                                    <p className="destination-location">
                                                        <MapPin size={14} /> {property.location}
                                                    </p>
                                                    <div className="destination-footer">
                                                        <div className="rating">
                                                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                                            <span>4.8</span>
                                                        </div>
                                                        <button
                                                            className="explore-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDest(property);
                                                                setShowDetail(true);
                                                            }}
                                                        >
                                                            Explore
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center mt-5 text-gray-500">No properties found.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* service */}
                        {activeTab === "experiences" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Star size={24} />
                                        Popular Destinations
                                    </h2>
                                </div>

                                <div className="destinations-grid">
                                    {properties.length > 0 ? (
                                        properties.map((property) => (
                                            <div key={property.id} className="destination-card">
                                                <div className="destination-image">
                                                    {property.images && property.images.length > 0 ? (
                                                        <img
                                                            src={property.images[0]}
                                                            alt={property.title}
                                                            className="property-img"
                                                        />
                                                    ) : (
                                                        <div className="no-image">No Image</div>
                                                    )}
                                                    <button
                                                        className="favorite-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFavBtn(property);
                                                        }}
                                                    >
                                                        <Heart size={20} />
                                                    </button>
                                                </div>

                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{property.title}</h3>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} / night
                                                        </span>
                                                    </div>
                                                    <p className="destination-location">
                                                        <MapPin size={14} /> {property.location}
                                                    </p>
                                                    <div className="destination-footer">
                                                        <div className="rating">
                                                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                                            <span>4.8</span>
                                                        </div>
                                                        <button
                                                            className="explore-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDest(property);
                                                                setShowDetail(true);
                                                            }}
                                                        >
                                                            Explore
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center mt-5 text-gray-500">No properties found.</p>
                                    )}
                                </div>
                            </section>
                        )}
                        {activeTab === "services" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Star size={24} />
                                        Popular Destinations
                                    </h2>
                                </div>

                                <div className="destinations-grid">
                                    {properties.length > 0 ? (
                                        properties.map((property) => (
                                            <div key={property.id} className="destination-card">
                                                <div className="destination-image">
                                                    {property.images && property.images.length > 0 ? (
                                                        <img
                                                            src={property.images[0]}
                                                            alt={property.title}
                                                            className="property-img"
                                                        />
                                                    ) : (
                                                        <div className="no-image">No Image</div>
                                                    )}
                                                    <button
                                                        className="favorite-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFavBtn(property);
                                                        }}
                                                    >
                                                        <Heart size={20} />
                                                    </button>
                                                </div>

                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{property.title}</h3>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} / night
                                                        </span>
                                                    </div>
                                                    <p className="destination-location">
                                                        <MapPin size={14} /> {property.location}
                                                    </p>
                                                    <div className="destination-footer">
                                                        <div className="rating">
                                                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                                            <span>4.8</span>
                                                        </div>
                                                        <button
                                                            className="explore-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDest(property);
                                                                setShowDetail(true);
                                                            }}
                                                        >
                                                            Explore
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center mt-5 text-gray-500">No properties found.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* TRIPS TAB */}
                        {activeTab === "favorite" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Calendar size={24} /> Upcoming Trips
                                    </h2>
                                </div>
                                <div className="trips-list">
                                    {upcomingTrips.map((trip) => (
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

                        {/* FAVORITES TAB */}
                        {activeTab === "favorites" && (
                            <section className="section">
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <Heart size={24} /> Saved Destinations
                                    </h2>
                                </div>

                                {favorites.length > 0 ? (
                                    <div className="destinations-grid">
                                        {favorites.map((fav) => (
                                            <div key={fav.propertyId} className="destination-card">
                                                <img
                                                    src={fav.propertyData.images?.[0]}
                                                    alt={fav.propertyData.title}
                                                    className="property-img"
                                                />
                                                <div className="destination-content">
                                                    <h3>{fav.propertyData.title}</h3>
                                                    <p>
                                                        <MapPin size={14} /> {fav.propertyData.location}
                                                    </p>
                                                    <button
                                                        className="explore-btn"
                                                        onClick={() => {
                                                            setSelectedDest(fav.propertyData);
                                                            setShowDetail(true);
                                                        }}
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Heart size={64} className="empty-icon" />
                                        <h3>No favorites yet</h3>
                                        <p>Start exploring and save your favorite destinations</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </main>

                {/* ================= MODAL (DETAIL VIEW) ================= */}
                {showDetail && selectedDest && (
                    <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setShowDetail(false)}>
                                <X />
                            </button>
                            <div className="modal-content">
                                {selectedDest.images && selectedDest.images.length > 0 && (
                                    <img
                                        src={selectedDest.images[0]}
                                        alt={selectedDest.title}
                                        className="w-60 h-60 object-cover rounded-xl"
                                    />
                                )}

                                <div className="modal-body">
                                    <h2 className="modal-title">
                                        {selectedDest.title}{" "}
                                        <span className="modal-price">
                                            ₱{selectedDest.price?.toLocaleString()} / night
                                        </span>
                                    </h2>
                                    <p className="modal-location">
                                        <MapPin size={14} /> {selectedDest.location}
                                    </p>
                                    <p className="modal-description">{selectedDest.description}</p>

                                    {/* Amenities */}
                                    {selectedDest.amenities && (
                                        <ul className="amenities-list">
                                            {selectedDest.amenities.map((item, i) => (
                                                <li key={i}>• {item}</li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Example Reviews */}
                                    <div className="reviews">
                                        <h4>Reviews</h4>
                                        <p>⭐ 4.8 (123 reviews)</p>
                                    </div>

                                    <div className="modal-actions">
                                        <button className="book-btn">Book Now</button>
                                        <button className="close-btn" onClick={() => setShowDetail(false)}>
                                            Close
                                        </button>
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
