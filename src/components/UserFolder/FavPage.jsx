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
    const [activeTab, setActiveTab] = useState("home");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [favoriteHouse, setFavoriteHouse] = useState([]);
    const [favoriteService, setfavoriteService] = useState([]);
    const [favoriteExp, setFavoriteExp] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(true);
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
            if (!user) {
                setFavoritesLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    // ✅ Fetch favorites for all categories
    useEffect(() => {
        if (!currentUser) {
            setFavoritesLoading(false);
            setFavoriteHouse([]);
            setfavoriteService([]);
            setFavoriteExp([]);
            return;
        }

        const fetchFavorites = async () => {
            try {
                setFavoritesLoading(true);
                console.log("Fetching favorites for user:", currentUser.uid);

                const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
                const favSnap = await getDocs(q);

                console.log("Favorites query result:", favSnap.docs.length, "documents");

                // Include document ID and process all favorites
                const allFavs = favSnap.docs.map((doc) => {
                    const data = doc.data();
                    console.log("Favorite doc:", doc.id, "Data:", data);
                    return {
                        id: doc.id,
                        propertyId: data.propertyId,
                        userId: data.userId,
                        category: data.category,
                        propertyData: data.propertyData,
                        createdAt: data.createdAt,
                    };
                });

                console.log("Total favorites found:", allFavs.length);
                console.log("All favorites:", allFavs);

                // Filter favorites by category
                // Support both old ("properties", "experiences") and new ("home", "experience") category names
                const propertiesFavs = allFavs.filter((fav) => {
                    // Check if propertyData exists
                    if (!fav.propertyData) {
                        console.warn("Favorite missing propertyData:", fav.id);
                        return false;
                    }

                    const category = fav.category || fav.propertyData?.category || "home";
                    // Support both "home" and "properties" for backward compatibility
                    const isProperty = category === "home" || category === "properties";
                    if (isProperty) {
                        console.log("✓ Property favorite:", fav.propertyData?.title || fav.propertyId);
                    }
                    return isProperty;
                });

                const servicesFavs = allFavs.filter((fav) => {
                    if (!fav.propertyData) {
                        return false;
                    }
                    const category = fav.category || fav.propertyData?.category;
                    const isService = category === "services";
                    if (isService) {
                        console.log("✓ Service favorite:", fav.propertyData?.title || fav.propertyId);
                    }
                    return isService;
                });

                const experiencesFavs = allFavs.filter((fav) => {
                    if (!fav.propertyData) {
                        return false;
                    }
                    const category = fav.category || fav.propertyData?.category;
                    // Support both "experience" and "experiences" for backward compatibility
                    const isExperience = category === "experience" || category === "experiences";
                    if (isExperience) {
                        console.log("✓ Experience favorite:", fav.propertyData?.title || fav.propertyId);
                    }
                    return isExperience;
                });

                console.log("Properties favorites count:", propertiesFavs.length);
                console.log("Services favorites count:", servicesFavs.length);
                console.log("Experiences favorites count:", experiencesFavs.length);

                setFavoriteHouse(propertiesFavs);
                setfavoriteService(servicesFavs);
                setFavoriteExp(experiencesFavs);
            } catch (error) {
                console.error("Error loading favorites:", error);
                alert("Error loading favorites. Please refresh the page.");
            } finally {
                setFavoritesLoading(false);
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

        // Use provided category or fallback to activeTab or property.category
        const favoriteCategory = category || activeTab || property.category || "home";

        try {
            const favDocRef = doc(db, "favorites", `${currentUser.uid}_${property.id}`);
            const favDoc = await getDoc(favDocRef);

            if (favDoc.exists()) {
                await deleteDoc(favDocRef);
                alert("Removed from favorites 💔");

                // Update local state after deletion
                if (favoriteCategory === "home" || favoriteCategory === "properties") {
                    setFavoriteHouse((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                } else if (favoriteCategory === "services") {
                    setfavoriteService((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                } else if (favoriteCategory === "experience" || favoriteCategory === "experiences") {
                    setFavoriteExp((prev) => prev.filter((fav) => fav.propertyId !== property.id));
                }

                // Refresh favorites from database to ensure consistency
                const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
                const favSnap = await getDocs(q);
                const allFavs = favSnap.docs
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .filter((fav) => fav.propertyData);

                const propertiesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "home" || cat === "properties";
                });
                const servicesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "services";
                });
                const experiencesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "experience" || cat === "experiences";
                });

                setFavoriteHouse(propertiesFavs);
                setfavoriteService(servicesFavs);
                setFavoriteExp(experiencesFavs);
            } else {
                await setDoc(favDocRef, {
                    userId: currentUser.uid,
                    propertyId: property.id,
                    propertyData: property,
                    category: favoriteCategory,
                    createdAt: new Date(),
                });
                alert("Added to favorites ❤️");

                // Refresh favorites from database to ensure consistency
                const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
                const favSnap = await getDocs(q);
                const allFavs = favSnap.docs
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .filter((fav) => fav.propertyData);

                const propertiesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "home" || cat === "properties";
                });
                const servicesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "services";
                });
                const experiencesFavs = allFavs.filter((fav) => {
                    const cat = fav.category || fav.propertyData?.category;
                    return cat === "experience" || cat === "experiences";
                });

                setFavoriteHouse(propertiesFavs);
                setfavoriteService(servicesFavs);
                setFavoriteExp(experiencesFavs);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            alert("Error updating favorite. Please try again.");
        }
    };

    // ✅ Filter favorites by search query
    const handleSearch = () => {
        // Search functionality can filter favorites if needed
        // For now, just log the search query
        console.log("Search query:", searchQuery);
    };

    // Get filtered favorites based on active tab and search query
    const getFilteredFavorites = () => {
        let favorites = [];
        if (activeTab === "home") {
            favorites = favoriteHouse;
        } else if (activeTab === "services") {
            favorites = favoriteService;
        } else if (activeTab === "experience") {
            favorites = favoriteExp;
        }

        // Filter by search query if provided
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            favorites = favorites.filter((fav) => {
                const property = fav.propertyData || {};
                const title = property.title?.toLowerCase() || "";
                const location = property.location?.address?.toLowerCase() ||
                    property.location?.toLowerCase() || "";
                return title.includes(query) || location.includes(query);
            });
        }

        return favorites;
    };

    const filteredFavorites = getFilteredFavorites();

    if (favoritesLoading) {
        return (
            <>
                <Header />
                <div className="homepage" role="Body">
                    <div style={{ padding: "2rem", textAlign: "center" }}>
                        <p>Loading favorites...</p>
                    </div>
                </div>
            </>
        );
    }

    if (!currentUser) {
        return (
            <>
                <Header />
                <div className="homepage" role="Body">
                    <div style={{ padding: "2rem", textAlign: "center" }}>
                        <h2>Please log in to view your favorites</h2>
                        <p>You need to be logged in to see your saved favorites.</p>
                    </div>
                </div>
            </>
        );
    }

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
                                className={`tab ${activeTab === "home" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("home")}
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
                                className={`tab ${activeTab === "experience" ? "tab-active" : ""}`}
                                onClick={() => setActiveTab("experience")}
                            >
                                Experiences
                            </button>
                        </div>

                        {/* PROPERTIES TAB */}
                        {activeTab === "home" && (
                            <section className="section">
                                {filteredFavorites.length > 0 ? (
                                    <div className="destinations-grid">
                                        {filteredFavorites.map((fav) => {
                                            // Ensure propertyData exists and has required fields
                                            if (!fav.propertyData) {
                                                console.warn("Favorite missing propertyData:", fav);
                                                return null;
                                            }

                                            const property = fav.propertyData;
                                            return (
                                                <div key={fav.id || fav.propertyId} className="destination-card">
                                                    <div className="destination-image">
                                                        {property.images && property.images.length > 0 ? (
                                                            <img
                                                                src={property.images[0]}
                                                                alt={property.title || "Property"}
                                                                className="property-img"
                                                            />
                                                        ) : (
                                                            <div className="no-image">No Image</div>
                                                        )}
                                                        <button
                                                            className="favorite-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFavBtn(property, "home");
                                                            }}
                                                        >
                                                            <Heart
                                                                size={20}
                                                                fill="#ff6b35"
                                                                color="#ff6b35"
                                                            />
                                                        </button>
                                                    </div>
                                                    <div className="destination-content">
                                                        <div className="destination-header">
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                                                <h3 className="destination-name">{property.title || "Untitled Property"}</h3>
                                                            </div>
                                                            <span className="destination-price">
                                                                ₱{property.price?.toLocaleString() || "0"} {property.day_night || "/ night"}
                                                            </span>
                                                        </div>
                                                        <p className="destination-location">
                                                            <MapPin size={14} /> {property.location?.address || property.location || "Location not specified"}
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
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Heart size={64} className="empty-icon" />
                                        <h3>No favorites yet</h3>
                                        <p>Start exploring and save your favorite properties</p>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* SERVICES TAB */}
                        {activeTab === "services" && (
                            <section className="section">
                                {filteredFavorites.length > 0 ? (
                                    <div className="destinations-grid">
                                        {filteredFavorites.map((fav) => {
                                            // Ensure propertyData exists and has required fields
                                            if (!fav.propertyData) {
                                                console.warn("Favorite missing propertyData:", fav);
                                                return null;
                                            }

                                            const property = fav.propertyData;
                                            return (
                                                <div key={fav.id || fav.propertyId} className="destination-card">
                                                    <div className="destination-image">
                                                        {property.images && property.images.length > 0 ? (
                                                            <img
                                                                src={property.images[0]}
                                                                alt={property.title || "Service"}
                                                                className="property-img"
                                                            />
                                                        ) : (
                                                            <div className="no-image">No Image</div>
                                                        )}
                                                        <button
                                                            className="favorite-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFavBtn(property, "services");
                                                            }}
                                                        >
                                                            <Heart
                                                                size={20}
                                                                fill="#ff6b35"
                                                                color="#ff6b35"
                                                            />
                                                        </button>
                                                    </div>
                                                    <div className="destination-content">
                                                        <div className="destination-header">
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                                                <h3 className="destination-name">{property.title || "Untitled Service"}</h3>
                                                            </div>
                                                            <span className="destination-price">
                                                                ₱{property.price?.toLocaleString() || "0"} {property.day_night || "/ Head"}
                                                            </span>
                                                        </div>
                                                        <p className="destination-location">
                                                            <MapPin size={14} /> {property.location?.address || property.location || "Location not specified"}
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
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Heart size={64} className="empty-icon" />
                                        <h3>No favorites yet</h3>
                                        <p>Start exploring and save your favorite services</p>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* EXPERIENCES TAB */}
                        {activeTab === "experience" && (
                            <section className="section">
                                {filteredFavorites.length > 0 ? (
                                    <div className="destinations-grid">
                                        {filteredFavorites.map((fav) => {
                                            // Ensure propertyData exists and has required fields
                                            if (!fav.propertyData) {
                                                console.warn("Favorite missing propertyData:", fav);
                                                return null;
                                            }

                                            const property = fav.propertyData;
                                            return (
                                                <div key={fav.id || fav.propertyId} className="destination-card">
                                                    <div className="destination-image">
                                                        {property.images && property.images.length > 0 ? (
                                                            <img
                                                                src={property.images[0]}
                                                                alt={property.title || "Experience"}
                                                                className="property-img"
                                                            />
                                                        ) : (
                                                            <div className="no-image">No Image</div>
                                                        )}
                                                        <button
                                                            className="favorite-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFavBtn(property, "experience");
                                                            }}
                                                        >
                                                            <Heart
                                                                size={20}
                                                                fill="#ff6b35"
                                                                color="#ff6b35"
                                                            />
                                                        </button>
                                                    </div>
                                                    <div className="destination-content">
                                                        <div className="destination-header">
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                                                <h3 className="destination-name">{property.title || "Untitled Experience"}</h3>
                                                            </div>
                                                            <span className="destination-price">
                                                                ₱{property.price?.toLocaleString() || "0"} {property.day_night || "/ person"}
                                                            </span>
                                                        </div>
                                                        <p className="destination-location">
                                                            <MapPin size={14} /> {property.location?.address || property.location || "Location not specified"}
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
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Heart size={64} className="empty-icon" />
                                        <h3>No favorites yet</h3>
                                        <p>Start exploring and save your favorite experiences</p>
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
