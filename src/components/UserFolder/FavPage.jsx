import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Star, Heart, X } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";
import MapViewer from "../ui/MapViewer";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    deleteDoc,
    setDoc,
    query,
    where,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function Body() {
    const [activeTab, setActiveTab] = useState("properties");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [favoriteHouse, setFavoriteHouse] = useState([]);
    const [favoriteService, setfavoriteService] = useState([]);
    const [favoriteExp, setFavoriteExp] = useState([]);
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
                setLoading(true);
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
    }, [activeTab]);

    // ✅ Fetch favorites for all categories
    useEffect(() => {
        if (!currentUser) return;
        const fetchFavorites = async () => {
            try {
                const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
                const favSnap = await getDocs(q);
                const allFavs = favSnap.docs.map((doc) => doc.data());
                
                // Filter favorites by category and set each state
                setFavoriteHouse(allFavs.filter((fav) => fav.category === "properties"));
                setfavoriteService(allFavs.filter((fav) => fav.category === "services"));
                setFavoriteExp(allFavs.filter((fav) => fav.category === "experiences"));
            } catch (error) {
                console.error("Error loading favorites:", error);
            }
        };
        fetchFavorites();
    }, [currentUser]);

    // ✅ Handle Favorite Add/Remove
    const handleFavBtn = async (property, category = null) => {
        if (!currentUser) {
            alert("Please log in to save favorites.");
            return;
        }
        if (!property) return;

        // Use provided category or fallback to activeTab
        const favoriteCategory = category || activeTab;

        try {
            const favDocRef = doc(db, "favorites", `${currentUser.uid}_${property.id}`);
            const favDoc = await getDoc(favDocRef);

            if (favDoc.exists()) {
                await deleteDoc(favDocRef);
                alert("Removed from favorites 💔");
                
                // Update local state after deletion
                if (favoriteCategory === "properties") {
                    setFavoriteHouse((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                } else if (favoriteCategory === "services") {
                    setfavoriteService((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                } else if (favoriteCategory === "experiences") {
                    setFavoriteExp((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                }
            } else {
                await setDoc(favDocRef, {
                    userId: currentUser.uid,
                    propertyId: property.id,
                    propertyData: property,
                    category: favoriteCategory,
                    createdAt: new Date(),
                });
                alert("Added to favorites ❤️");
                
                // Update local state after addition
                const newFavorite = {
                    userId: currentUser.uid,
                    propertyId: property.id,
                    propertyData: property,
                    category: favoriteCategory,
                    createdAt: new Date(),
                };
                if (favoriteCategory === "properties") {
                    setFavoriteHouse((prev) => [...prev, newFavorite]);
                } else if (favoriteCategory === "services") {
                    setfavoriteService((prev) => [...prev, newFavorite]);
                } else if (favoriteCategory === "experiences") {
                    setFavoriteExp((prev) => [...prev, newFavorite]);
                }
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

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
                    <div className="section-header">
                        <h2 className="section-title">
                            <Star size={24} />
                            Saved Destinations
                        </h2>
                    </div>
                        {/* TABS */}
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === "properties" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("properties")}
                            >
                                Properties
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

                        {/* PROPERTIES TAB */}
                        {activeTab === "properties" && (
                            <section className="section">
                                

                                {favoriteHouse.length > 0 ? (
                                    <div className="destinations-grid">
                                        {favoriteHouse.map((fav) => (
                                            <div key={fav.propertyId} className="destination-card">
                                                <img
                                                    src={fav.propertyData.images?.[0]}
                                                    alt={fav.propertyData.title}
                                                    className="property-img"
                                                />
                                                <div className="destination-content">
                                                    <h3>{fav.propertyData.title}</h3>
                                                    <p>
                                                        <MapPin size={14} /> {fav.propertyData.location?.address || fav.propertyData.location || "Location not specified"}
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

                        {/* SERVICES TAB */}
                        {activeTab === "services" && (
                            <section className="section">
                                

                                {favoriteService.length > 0 ? (
                                    <div className="destinations-grid">
                                        {favoriteService.map((fav) => (
                                            <div key={fav.propertyId} className="destination-card">
                                                <img
                                                    src={fav.propertyData.images?.[0]}
                                                    alt={fav.propertyData.title}
                                                    className="property-img"
                                                />
                                                <div className="destination-content">
                                                    <h3>{fav.propertyData.title}</h3>
                                                    <p>
                                                        <MapPin size={14} /> {fav.propertyData.location?.address || fav.propertyData.location || "Location not specified"}
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

                        {/* EXPERIENCES TAB */}
                        {activeTab === "experiences" && (
                            <section className="section">
                                

                                {favoriteExp.length > 0 ? (
                                    <div className="destinations-grid">
                                        {favoriteExp.map((fav) => (
                                            <div key={fav.propertyId} className="destination-card">
                                                <img
                                                    src={fav.propertyData.images?.[0]}
                                                    alt={fav.propertyData.title}
                                                    className="property-img"
                                                />
                                                <div className="destination-content">
                                                    <h3>{fav.propertyData.title}</h3>
                                                    <p>
                                                        <MapPin size={14} /> {fav.propertyData.location?.address || fav.propertyData.location || "Location not specified"}
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
                                        <MapPin size={14} /> {selectedDest.location?.address || selectedDest.location || "Location not specified"}
                                    </p>
                                    
                                    {/* Map Viewer */}
                                    {selectedDest.location && (selectedDest.location.lat && selectedDest.location.lng) && (
                                        <MapViewer 
                                            location={selectedDest.location} 
                                            propertyTitle={selectedDest.title}
                                        />
                                    )}
                                    
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
