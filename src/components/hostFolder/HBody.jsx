import Header from "./Hheader";
import Footer from "../generalFile/Footer";
import { useState, useEffect, useCallback } from "react";
import { MessageCircleMore, Heart, MapPin, Star, Plus, X, Search } from "lucide-react";
import "../../components/cssFile/temp.css";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import AddProperty from "../ui/AddProperty";
import HostingType from "../ui/HostingType";
import Earnings from "./Earnings";
import { collection as fbCollection, getDocs as fbGetDocs, query as fbQuery, where as fbWhere } from "firebase/firestore";

export default function HostBody() {
    const [activeTab, setActiveTab] = useState("all");
    const [selectedDest, setSelectedDest] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHostForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [todayBookings, setTodayBookings] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [filterGuests, setFilterGuests] = useState("");
    const [guests, setGuests] = useState({ adults: 1, children: 0, infants: 0 });
    const [allBookings, setAllBookings] = useState([]);

    // Load current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch user properties
    useEffect(() => {
        const fetchProperties = async () => {
            console.log(activeTab + " running fetchProperties")
            if (!currentUser) return;
            setLoading(true);
            try {
                let data = [];

                if (activeTab === "all") {
                    // Fetch from all collections for this host
                    const [propertiesSnapshot, servicesSnapshot, experiencesSnapshot] = await Promise.all([
                        getDocs(query(collection(db, "properties"), where("ownerId", "==", currentUser.uid))),
                        getDocs(query(collection(db, "services"), where("ownerId", "==", currentUser.uid))),
                        getDocs(query(collection(db, "experiences"), where("ownerId", "==", currentUser.uid)))
                    ]);

                    const propertiesData = propertiesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        category: "properties",
                        ...doc.data(),
                    }));

                    const servicesData = servicesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        category: "services",
                        ...doc.data(),
                    }));

                    const experiencesData = experiencesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        category: "experiences",
                        ...doc.data(),
                    }));

                    data = [...propertiesData, ...servicesData, ...experiencesData];
                } else {
                    // Fetch from specific collection
                    const q = query(collection(db, activeTab), where("ownerId", "==", currentUser.uid));
                    const querySnapshot = await getDocs(q);
                    data = querySnapshot.docs.map((doc) => ({
                        id: doc.id,
                        category: activeTab,
                        ...doc.data(),
                    }));
                }

                setAllProperties(data);
                // Initially show all properties (will be filtered by handleSearch if there are active filters)
                setProperties(data);
                
                // Extract unique locations for autocomplete
                const uniqueLocations = [...new Set(data.map(p => {
                    const locationStr = p.location?.address || p.location;
                    return locationStr && typeof locationStr === 'string' ? locationStr : null;
                }).filter(Boolean))];
                setLocationSuggestions(uniqueLocations);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [currentUser, activeTab]);

    // Fetch all bookings for date filtering
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const bookingsSnapshot = await getDocs(collection(db, "bookings"));
                const bookingsData = bookingsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setAllBookings(bookingsData);
            } catch (error) {
                console.error("Error fetching bookings:", error);
            }
        };
        fetchBookings();
    }, []);

    // Location autocomplete filter
    useEffect(() => {
        if (locationInput.trim() && allProperties.length > 0) {
            const filtered = allProperties
                .map(p => {
                    const locationStr = p.location?.address || p.location;
                    return locationStr && typeof locationStr === 'string' ? locationStr : null;
                })
                .filter(Boolean)
                .filter(loc => 
                    loc.toLowerCase().includes(locationInput.toLowerCase())
                );
            const uniqueLocations = [...new Set(filtered)];
            setLocationSuggestions(uniqueLocations.slice(0, 5)); // Limit to 5 suggestions
        } else if (allProperties.length > 0) {
            const uniqueLocations = [...new Set(allProperties.map(p => {
                const locationStr = p.location?.address || p.location;
                return locationStr && typeof locationStr === 'string' ? locationStr : null;
            }).filter(Boolean))];
            setLocationSuggestions(uniqueLocations.slice(0, 5));
        }
    }, [locationInput, allProperties]);

    // Update searchQuery when locationInput changes
    useEffect(() => {
        if (locationInput && !searchQuery) {
            setSearchQuery(locationInput);
        }
    }, [locationInput]);

    // Fetch bookings for this host (today and upcoming)
    useEffect(() => {
        const loadBookings = async () => {
            if (!currentUser) return;
            try {
                const q = fbQuery(fbCollection(db, "bookings"), fbWhere("hostId", "==", currentUser.uid));
                const snap = await fbGetDocs(q);
                const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                const today = [];
                const upcoming = [];
                const todayDate = new Date();
                const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime();
                const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
                all.forEach((b) => {
                    // Handle Firestore Timestamps
                    const startDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
                    const start = startDate.getTime();
                    if (!isNaN(start)) {
                        if (start >= startOfToday && start <= endOfToday) today.push(b);
                        else if (start > endOfToday) upcoming.push(b);
                    }
                });
                setTodayBookings(today.sort((a,b)=> {
                    const aStart = a.startDate?.toDate ? a.startDate.toDate().getTime() : new Date(a.startDate).getTime();
                    const bStart = b.startDate?.toDate ? b.startDate.toDate().getTime() : new Date(b.startDate).getTime();
                    return aStart - bStart;
                }));
                setUpcomingBookings(upcoming.sort((a,b)=> {
                    const aStart = a.startDate?.toDate ? a.startDate.toDate().getTime() : new Date(a.startDate).getTime();
                    const bStart = b.startDate?.toDate ? b.startDate.toDate().getTime() : new Date(b.startDate).getTime();
                    return aStart - bStart;
                }));
            } catch (e) {
                console.error(e);
            }
        };
        loadBookings();
    }, [currentUser]);

    // Helper function to normalize dates
    const normalizeDate = (date) => {
        if (!date) return null;
        if (date && typeof date.toDate === 'function') {
            return date.toDate().toISOString().split('T')[0];
        }
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        return date;
    };

    // Helper function to check date overlap
    const isOverlapping = (startA, endA, startB, endB) => {
        const aStart = normalizeDate(startA);
        const bStart = normalizeDate(startB);
        const aEnd = normalizeDate(endA);
        const bEnd = normalizeDate(endB);
        
        if (!aStart || !aEnd || !bStart || !bEnd) return false;
        
        const aStartTime = new Date(aStart).getTime();
        const aEndTime = new Date(aEnd).getTime();
        const bStartTime = new Date(bStart).getTime();
        const bEndTime = new Date(bEnd).getTime();
        
        if (Number.isNaN(aStartTime) || Number.isNaN(aEndTime) || Number.isNaN(bStartTime) || Number.isNaN(bEndTime)) return false;
        return aStartTime <= bEndTime && bStartTime <= aEndTime;
    };

    // Calculate total guests
    const totalGuests = guests.adults + guests.children + guests.infants;
    
    // Update filterGuests when guests state changes
    useEffect(() => {
        if (totalGuests > 0) {
            setFilterGuests(totalGuests.toString());
        }
    }, [totalGuests]);

    // Filter Search with improved date filtering
    const handleSearch = useCallback(() => {
        if (allProperties.length === 0) {
            return;
        }

        const query = (searchQuery || locationInput || "").trim();
        const guestCount = totalGuests > 1 ? totalGuests : (filterGuests ? Number(filterGuests) : 0);
        const hasDateFilter = checkInDate && checkOutDate;
        
        // If no filters are applied, show all properties
        if (!query && guestCount === 0 && !hasDateFilter) {
            setProperties([...allProperties]);
            return;
        }

        let filtered = [...allProperties];

        // Filter by location/title
        if (query) {
            filtered = filtered.filter((p) => {
                const locationStr = p.location?.address || p.location;
                const locationMatch = locationStr && typeof locationStr === 'string' 
                    ? locationStr.toLowerCase().includes(query.toLowerCase())
                    : false;
                const titleMatch = p.title?.toLowerCase().includes(query.toLowerCase()) || false;
                return locationMatch || titleMatch;
            });
        }

        // Filter by guest count
        if (guestCount > 0) {
            filtered = filtered.filter(
                (p) => p.maxGuests && Number(p.maxGuests) >= guestCount
            );
        }

        // Filter by date availability - check for booking conflicts
        if (hasDateFilter) {
            const start = new Date(checkInDate);
            const end = new Date(checkOutDate);
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                filtered = filtered.filter((p) => {
                    // Get bookings for this property
                    const propertyBookings = allBookings.filter(
                        (b) => b.listingId === p.id && b.status !== "cancelled"
                    );
                    
                    // Check if search dates overlap with any existing booking
                    const hasConflict = propertyBookings.some((booking) =>
                        isOverlapping(checkInDate, checkOutDate, booking.startDate, booking.endDate)
                    );
                    
                    // Only show properties that don't have conflicts
                    return !hasConflict;
                });
            }
        }

        setProperties(filtered);
    }, [searchQuery, locationInput, checkInDate, checkOutDate, filterGuests, totalGuests, allProperties, allBookings]);

    // Auto-search with debouncing when inputs change or properties are loaded
    useEffect(() => {
        if (allProperties.length === 0) {
            setProperties([]);
            return;
        }
        
        const timeoutId = setTimeout(() => {
            handleSearch();
        }, 300);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, locationInput, checkInDate, checkOutDate, filterGuests, totalGuests, allProperties.length, allBookings.length]);

    // Reset search when tab changes
    useEffect(() => {
        setSearchQuery("");
        setLocationInput("");
        setCheckInDate("");
        setCheckOutDate("");
        setFilterGuests("");
        setGuests({ adults: 1, children: 0, infants: 0 });
        // Properties will be updated when allProperties changes after tab switch
    }, [activeTab]);


    // ✅ Safe delete: Firestore only (no Cloudinary deletion)
    const handleDelete = async (property) => {
        if (!window.confirm("Are you sure you want to delete this property?")) return;

        try {
            // 1. Delete Firestore document
            await deleteDoc(doc(db, "properties", property.id));

            // 2. Update UI instantly
            setProperties((prev) => prev.filter((p) => p.id !== property.id));

            alert("Property deleted successfully! (Images remain in Cloudinary for safety)");
        } catch (error) {
            console.error("Error deleting property:", error);
            alert("Failed to delete property. Please try again.");
        }
    };

    // ✅ Handle editing and saving changes
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const propertyRef = doc(db, "properties", selectedDest.id);
            await updateDoc(propertyRef, {
                title: selectedDest.title,
                location: typeof selectedDest.location === 'string' 
                    ? selectedDest.location 
                    : (selectedDest.location?.address || ""),
                price: selectedDest.price,
                description: selectedDest.description,
            });

            setProperties((prev) =>
                prev.map((p) => (p.id === selectedDest.id ? { ...p, ...selectedDest } : p))
            );

            setShowEditForm(false);
            alert("Property updated successfully!");
        } catch (error) {
            console.error("Error updating property:", error);
            alert("Failed to update property.");
        }
    };

    return (
        <>
            <Header />
            <div role="body" className="host_Body">
                <h1>Dashboard</h1>

                {/* Search Bar */}
                <div style={{ maxWidth: "850px", margin: "2rem auto", padding: "0 1rem" }}>
                    <div className="airbnb-search-bar">
                        {/* Location Section with Input */}
                        <div className="search-section search-section-input">
                            <div className="search-section-label">Where</div>
                            <input
                                type="text"
                                placeholder="Search destinations"
                                className="search-section-input-field"
                                value={locationInput || searchQuery || ""}
                                onChange={(e) => {
                                    setLocationInput(e.target.value);
                                    setSearchQuery(e.target.value);
                                }}
                            />
                            {/* Location Suggestions Dropdown */}
                            {locationSuggestions.length > 0 && (locationInput || searchQuery) && locationInput.trim() !== "" && (
                                <div className="location-suggestions-dropdown-inline">
                                    {locationSuggestions.slice(0, 5).map((location, index) => (
                                        <div
                                            key={index}
                                            className="location-suggestion-item"
                                            onClick={() => {
                                                setLocationInput(location);
                                                setSearchQuery(location);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                        >
                                            <MapPin size={16} />
                                            <span>{location}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Check-in Date Section with Input */}
                        <div className="search-section search-section-input">
                            <div className="search-section-label">Check in</div>
                            <input
                                type="date"
                                className="search-section-input-field search-section-date-input"
                                value={checkInDate}
                                onChange={(e) => {
                                    setCheckInDate(e.target.value);
                                    if (checkOutDate && e.target.value && new Date(e.target.value) >= new Date(checkOutDate)) {
                                        setCheckOutDate("");
                                    }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Check-out Date Section with Input */}
                        <div className="search-section search-section-input">
                            <div className="search-section-label">Check out</div>
                            <input
                                type="date"
                                className="search-section-input-field search-section-date-input"
                                value={checkOutDate}
                                onChange={(e) => setCheckOutDate(e.target.value)}
                                min={checkInDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Guests Section with Input */}
                        <div className="search-section search-section-guests search-section-input">
                            <div className="search-section-label">Who</div>
                            <input
                                type="number"
                                className="search-section-input-field"
                                placeholder="Add guests"
                                min="1"
                                value={totalGuests > 0 ? totalGuests : ""}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    if (value >= 1) {
                                        setGuests({ adults: value, children: 0, infants: 0 });
                                        setFilterGuests(value.toString());
                                    } else if (e.target.value === "") {
                                        setGuests({ adults: 1, children: 0, infants: 0 });
                                        setFilterGuests("");
                                    }
                                }}
                            />
                        </div>

                        {/* Search Button */}
                        <button 
                            className="airbnb-search-btn" 
                            onClick={() => {
                                handleSearch();
                            }}
                        >
                            <Search size={20} />
                            <span>Search</span>
                        </button>
                    </div>
                </div>

                <main>
                    <article>
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === "all" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("all");
                                    console.log("All tab clicked");
                                }}
                            >
                                All
                            </button>
                            <button
                                className={`tab ${activeTab === "properties" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("properties");
                                    console.log("Properties tab clicked");
                                }}
                            >
                                Home
                            </button>
                            <button
                                className={`tab ${activeTab === "services" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("services")
                                    console.log("Service tab clicked");
                                }}
                            >
                                Services
                            </button>
                            <button
                                className={`tab ${activeTab === "experiences" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("experiences")
                                    console.log("Experiences tab clicked");
                                }}
                            >
                                Experiences
                            </button>
                            <button
                                className={`tab ${activeTab === "earnings" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("earnings")
                                    console.log("Earnings tab clicked");
                                }}
                            >
                                Earnings
                            </button>
                        </div>
                    </article>

                    <article>
                        {activeTab === "earnings" ? (
                            <Earnings showHeader={false} />
                        ) : activeTab && (
                            <section className="section">
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
                                                </div>

                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                                            <h3 className="destination-name">{property.title}</h3>
                                                            {activeTab === "all" && property.category && (
                                                                <span style={{
                                                                    fontSize: "11px",
                                                                    fontWeight: "600",
                                                                    textTransform: "uppercase",
                                                                    color: "#717171",
                                                                    backgroundColor: "#f7f7f7",
                                                                    padding: "2px 8px",
                                                                    borderRadius: "4px"
                                                                }}>
                                                                    {property.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} {property.day_night || (property.category === "services" ? "/ Head" : "/ night")}
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

                                                        <div className="edit_del_Btn_grp">
                                                            <button
                                                                className="explore-btn"
                                                                onClick={() => {
                                                                    setSelectedDest(property);
                                                                    setShowEditForm(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="del-property-btn"
                                                                onClick={() => handleDelete(property)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
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

                        {/* Add Property Modal */}
                        {showHostForm && (
                            <div className="modal-overlay">
                                <div className="modal host-modal" onClick={(e) => e.stopPropagation()}>
                                    <HostingType
                                        onClose={() => setShowForm(false)}
                                    />

                                </div>
                            </div>
                        )}

                        {/* Edit Modal */}
                        {showEditForm && selectedDest && (
                            <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
                                <div className="modal" onClick={(e) => e.stopPropagation()}>
                                    <button className="modal-close" onClick={() => setShowEditForm(false)}>
                                        <X />
                                    </button>
                                    <h2>Edit Property</h2>

                                    <form onSubmit={handleEditSubmit} className="edit-form">
                                        <label>
                                            Title:
                                            <input
                                                type="text"
                                                value={selectedDest.title}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, title: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Location:
                                            <input
                                                type="text"
                                                value={typeof selectedDest.location === 'string' 
                                                    ? selectedDest.location 
                                                    : (selectedDest.location?.address || "")}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, location: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Price:
                                            <input
                                                type="number"
                                                value={selectedDest.price}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, price: parseFloat(e.target.value) })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Description:
                                            <textarea
                                                value={selectedDest.description}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, description: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <div className="modal-actions">
                                            <button type="submit" className="book-btn">
                                                Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                className="close-btn"
                                                onClick={() => setShowEditForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </article>
                </main>

                <div className="floater-container">
                    <button className="icon-btn" onClick={() => setShowForm(true)}>
                        <Plus size={20} />
                    </button>
                    <button className="icon-btn">
                        <MessageCircleMore size={20} />
                    </button>
                </div>
            </div>
            <Footer />
        </>
    );
}
