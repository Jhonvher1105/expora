import { useState, useEffect } from "react";
import { MapPin, Star, X, Sparkles } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";
import MapViewer from "../ui/MapViewer";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function SuggestionsPage() {
    const [activeTab, setActiveTab] = useState("properties");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [allProperties, setAllProperties] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [browsingHistory, setBrowsingHistory] = useState([]);

    // ✅ Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // ✅ Fetch browsing history
    useEffect(() => {
        if (!currentUser) return;
        const fetchBrowsingHistory = async () => {
            try {
                const q = query(
                    collection(db, "userBrowsingHistory"),
                    where("userId", "==", currentUser.uid)
                );
                const snap = await getDocs(q);
                const history = snap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                // Sort by timestamp (most recent first)
                history.sort((a, b) => {
                    const aTime = a.viewedAt?.toDate?.()?.getTime() || a.viewedAt || 0;
                    const bTime = b.viewedAt?.toDate?.()?.getTime() || b.viewedAt || 0;
                    return bTime - aTime;
                });
                setBrowsingHistory(history);
            } catch (error) {
                console.error("Error loading browsing history:", error);
            }
        };
        fetchBrowsingHistory();
    }, [currentUser]);

    // ✅ Fetch all properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setLoading(true);
                const querySnapshot = await getDocs(collection(db, activeTab));
                const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setAllProperties(data);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [activeTab]);

    // ✅ Generate recommendations based on browsing history
    useEffect(() => {
        if (!currentUser || allProperties.length === 0 || browsingHistory.length === 0) {
            setRecommendations([]);
            return;
        }

        const generateRecommendations = () => {
            // Analyze browsing history to extract preferences
            const preferences = {
                locations: new Set(),
                priceRanges: [],
                categories: new Set(),
                amenities: new Set(),
            };

            browsingHistory.forEach((item) => {
                if (item.propertyData) {
                    const locationStr = item.propertyData.location?.address || item.propertyData.location;
                    if (locationStr && typeof locationStr === 'string') {
                        preferences.locations.add(locationStr.toLowerCase());
                    }
                    if (item.propertyData.price) {
                        preferences.priceRanges.push(item.propertyData.price);
                    }
                    if (item.propertyData.category) {
                        preferences.categories.add(item.propertyData.category);
                    }
                    if (item.propertyData.amenities && Array.isArray(item.propertyData.amenities)) {
                        item.propertyData.amenities.forEach((amenity) =>
                            preferences.amenities.add(amenity.toLowerCase())
                        );
                    }
                }
            });

            // Calculate average price
            const avgPrice =
                preferences.priceRanges.length > 0
                    ? preferences.priceRanges.reduce((a, b) => a + b, 0) / preferences.priceRanges.length
                    : 0;

            // Score and rank properties
            const scoredProperties = allProperties
                .filter((prop) => prop.id) // Ensure property has ID
                .map((property) => {
                    let score = 0;

                    // Priority 1: Location match (highest weight: 50 points)
                    const locationStr = property.location?.address || property.location;
                    if (locationStr && typeof locationStr === 'string' && preferences.locations.has(locationStr.toLowerCase())) {
                        score += 50;
                    }

                    // Priority 2: Price similarity (weight: 30 points)
                    if (property.price && avgPrice > 0) {
                        const priceDiff = Math.abs(property.price - avgPrice);
                        const priceSimilarity = Math.max(0, 1 - priceDiff / avgPrice);
                        score += priceSimilarity * 30;
                    }

                    // Priority 3: Amenities match (weight: 20 points)
                    if (property.amenities && Array.isArray(property.amenities)) {
                        const matchingAmenities = property.amenities.filter((amenity) =>
                            preferences.amenities.has(amenity.toLowerCase())
                        ).length;
                        const amenityScore = (matchingAmenities / Math.max(preferences.amenities.size, 1)) * 20;
                        score += amenityScore;
                    }

                    return { property, score };
                })
                .filter((item) => item.score > 0) // Only include properties with some match
                .sort((a, b) => b.score - a.score) // Sort by score descending
                .map((item) => item.property);

            setRecommendations(scoredProperties);
        };

        generateRecommendations();
    }, [allProperties, browsingHistory, currentUser]);

    // ✅ Track property view in browsing history
    const trackPropertyView = async (property) => {
        if (!currentUser || !property) return;

        try {
            const historyDocRef = doc(db, "userBrowsingHistory", `${currentUser.uid}_${property.id}`);
            await setDoc(
                historyDocRef,
                {
                    userId: currentUser.uid,
                    propertyId: property.id,
                    propertyData: property,
                    category: activeTab,
                    viewedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Error tracking property view:", error);
        }
    };

    // Display recommendations (3 by default, all if showAll is true)
    const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 3);

    if (loading) return <p className="text-center mt-10">Loading recommendations...</p>;

    return (
        <>
            <Header />
            <div className="homepage" role="Body">
                {/* ================= HERO SECTION ================= */}
                <section className="hero">
                    <div className="hero-content">
                        <h1 className="hero-title">Recommendations for You</h1>
                        <p className="hero-subtitle">
                            Discover properties tailored to your preferences and browsing history
                        </p>
                    </div>
                </section>

                {/* ================= MAIN CONTENT ================= */}
                <main className="main-content">
                    <div className="container">
                        <div className="section-header">
                            <h2 className="section-title">
                                <Sparkles size={24} />
                                Recommended Properties
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

                        {/* RECOMMENDATIONS SECTION */}
                        <section className="section">
                            {recommendations.length > 0 ? (
                                <>
                                    <div className="destinations-grid">
                                        {displayedRecommendations.map((property) => (
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
                                                </div>
                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{property.title}</h3>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} / night
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
                                                            onClick={() => {
                                                                trackPropertyView(property);
                                                                setSelectedDest(property);
                                                                setShowDetail(true);
                                                            }}
                                                        >
                                                            Explore
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* See All Button */}
                                    {recommendations.length > 3 && !showAll && (
                                        <div style={{ textAlign: "center", marginTop: "32px" }}>
                                            <button
                                                className="explore-btn"
                                                onClick={() => setShowAll(true)}
                                                style={{
                                                    padding: "12px 32px",
                                                    fontSize: "16px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                See All Recommendations ({recommendations.length})
                                            </button>
                                        </div>
                                    )}

                                    {/* Show Less Button */}
                                    {showAll && recommendations.length > 3 && (
                                        <div style={{ textAlign: "center", marginTop: "32px" }}>
                                            <button
                                                className="explore-btn"
                                                onClick={() => setShowAll(false)}
                                                style={{
                                                    padding: "12px 32px",
                                                    fontSize: "16px",
                                                    fontWeight: "600",
                                                    background: "#666",
                                                }}
                                            >
                                                Show Less
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="empty-state">
                                    <Sparkles size={64} className="empty-icon" />
                                    <h3>No recommendations yet</h3>
                                    <p>
                                        Start browsing properties to get personalized recommendations based on your preferences
                                    </p>
                                </div>
                            )}
                        </section>
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

export default SuggestionsPage;

