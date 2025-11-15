import Header from "./Hheader";
import Footer from "../generalFile/Footer";
import { useState, useEffect, useCallback } from "react";
import { MessageCircleMore, Heart, MapPin, Star, Plus, X, Search, Calendar, Users, DollarSign, CheckCircle, Clock, XCircle, User, Mail, Phone, LayoutGrid, BarChart3, Wallet } from "lucide-react";
import "../../components/cssFile/temp.css";
import { useChat } from "../../context/ChatContext";
import ChatModal from "../ui/ChatModal";
import DateRangePicker from "../ui/DateRangePicker";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import AddProperty from "../ui/AddProperty";
import HostingType from "../ui/HostingType";
import Earnings from "./Earnings";
import { collection as fbCollection, getDocs as fbGetDocs, query as fbQuery, where as fbWhere } from "firebase/firestore";
import HostBooking from "./HostBooking";

export default function HostBody() {
    const [activeTab, setActiveTab] = useState("all");
    const [activeBodyTab, setActiveBodyTab] = useState("listing");
    const [selectedDest, setSelectedDest] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHostForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [todayBookings, setTodayBookings] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [dashboardFilter, setDashboardFilter] = useState("today"); // "today" or "upcoming"
    const [statusFilter, setStatusFilter] = useState("all"); // "all", "confirmed", "pending", "cancelled"
    const [selectedBooking, setSelectedBooking] = useState(null); // Selected booking for modal
    const [guestInfo, setGuestInfo] = useState({}); // Store guest info by guestId
    const [loadingGuests, setLoadingGuests] = useState({}); // Track loading state for each guest

    // Chat system
    const { openChat } = useChat();

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
                setTodayBookings(today.sort((a, b) => {
                    const aStart = a.startDate?.toDate ? a.startDate.toDate().getTime() : new Date(a.startDate).getTime();
                    const bStart = b.startDate?.toDate ? b.startDate.toDate().getTime() : new Date(b.startDate).getTime();
                    return aStart - bStart;
                }));
                setUpcomingBookings(upcoming.sort((a, b) => {
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

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Helper function to format date
    const formatDate = (date) => {
        if (!date) return "N/A";
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    // Helper function to get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case "confirmed":
                return {
                    color: "#10b981",
                    bgColor: "#d1fae5",
                    icon: <CheckCircle size={16} />,
                    text: "Confirmed"
                };
            case "pending":
                return {
                    color: "#f59e0b",
                    bgColor: "#fef3c7",
                    icon: <Clock size={16} />,
                    text: "Pending"
                };
            case "cancelled":
                return {
                    color: "#ef4444",
                    bgColor: "#fee2e2",
                    icon: <XCircle size={16} />,
                    text: "Cancelled"
                };
            default:
                return {
                    color: "#6b7280",
                    bgColor: "#f3f4f6",
                    icon: <Clock size={16} />,
                    text: status || "Unknown"
                };
        }
    };

    // Fetch guest information
    const fetchGuestInfo = async (guestId) => {
        if (!guestId || guestInfo[guestId]) return; // Already fetched
        
        setLoadingGuests(prev => ({ ...prev, [guestId]: true }));
        
        try {
            const guestDoc = await getDoc(doc(db, "users", guestId));
            if (guestDoc.exists()) {
                setGuestInfo(prev => ({
                    ...prev,
                    [guestId]: guestDoc.data()
                }));
            }
        } catch (error) {
            console.error("Error fetching guest info:", error);
        } finally {
            setLoadingGuests(prev => ({ ...prev, [guestId]: false }));
        }
    };

    // Fetch guest info when modal opens
    useEffect(() => {
        if (selectedBooking && selectedBooking.guestId && !guestInfo[selectedBooking.guestId] && !loadingGuests[selectedBooking.guestId]) {
            fetchGuestInfo(selectedBooking.guestId);
        }
    }, [selectedBooking]);

    return (
        <>
            <Header />
            <div role="body" className="host_Body">
                <nav className="host-body-nav">
                    <button
                        className={`host-nav-btn ${activeBodyTab === "listing" ? "active" : ""}`}
                        onClick={() => setActiveBodyTab("listing")}
                    >
                        <LayoutGrid size={20} />
                        <span>Listing</span>
                    </button>
                    <button
                        className={`host-nav-btn ${activeBodyTab === "dashboard" ? "active" : ""}`}
                        onClick={() => setActiveBodyTab("dashboard")}
                    >
                        <BarChart3 size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`host-nav-btn ${activeBodyTab === "earnings" ? "active" : ""}`}
                        onClick={() => setActiveBodyTab("earnings")}
                    >
                        <Wallet size={20} />
                        <span>Earnings</span>
                    </button>
                </nav>

                {/* Search Bar */}
                {activeBodyTab === "listing" && (
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

                            {/* Date Range Picker - Combined Check-in and Check-out */}
                            <DateRangePicker
                                checkInDate={checkInDate}
                                checkOutDate={checkOutDate}
                                onDateChange={(dates) => {
                                    setCheckInDate(dates.checkIn || "");
                                    setCheckOutDate(dates.checkOut || "");
                                }}
                                minDate={new Date().toISOString().split('T')[0]}
                            />

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
                )}

                <main>
                    <article>
                        <div className="filter">

                            {activeBodyTab === "listing" && (
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
                                </div>
                            )}
                        </div>
                    </article>

                    <article>

                        
                        {activeBodyTab === "earnings" && (
                            <Earnings showHeader={false} />
                        )}

                        {activeBodyTab === "listing" && (
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
                            </section>)}

                        {activeBodyTab === "dashboard" && (
                            <section className="section" style={{ backgroundColor: "#1f2937", minHeight: "100vh", padding: "2rem" }}>
                                <div style={{ marginBottom: "2rem" }}>
                                    <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1.5rem", color: "#ffffff" }}>
                                        Dashboard
                                    </h1>
                                    
                                    {/* Filter Buttons and Dropdown */}
                                    <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
                                        <button
                                            onClick={() => setDashboardFilter("today")}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                borderRadius: "8px",
                                                border: "2px solid",
                                                borderColor: dashboardFilter === "today" ? "#3b82f6" : "#4b5563",
                                                backgroundColor: dashboardFilter === "today" ? "#3b82f6" : "transparent",
                                                color: dashboardFilter === "today" ? "white" : "#e5e7eb",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            Today ({todayBookings.length})
                                        </button>
                                        <button
                                            onClick={() => setDashboardFilter("upcoming")}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                borderRadius: "8px",
                                                border: "2px solid",
                                                borderColor: dashboardFilter === "upcoming" ? "#3b82f6" : "#4b5563",
                                                backgroundColor: dashboardFilter === "upcoming" ? "#3b82f6" : "transparent",
                                                color: dashboardFilter === "upcoming" ? "white" : "#e5e7eb",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            Upcoming ({upcomingBookings.length})
                                        </button>
                                        
                                        {/* Status Filter Dropdown */}
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                borderRadius: "8px",
                                                border: "2px solid #4b5563",
                                                backgroundColor: "#374151",
                                                color: "#e5e7eb",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                fontSize: "0.9375rem",
                                                outline: "none",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor = "#3b82f6";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor = "#4b5563";
                                            }}
                                        >
                                            <option value="all" style={{ backgroundColor: "#374151", color: "#e5e7eb" }}>All Status</option>
                                            <option value="confirmed" style={{ backgroundColor: "#374151", color: "#e5e7eb" }}>Confirmed</option>
                                            <option value="pending" style={{ backgroundColor: "#374151", color: "#e5e7eb" }}>Pending</option>
                                            <option value="cancelled" style={{ backgroundColor: "#374151", color: "#e5e7eb" }}>Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Bookings Display */}
                                    {(() => {
                                        let bookingsToShow = dashboardFilter === "today" ? todayBookings : upcomingBookings;
                                        
                                        // Apply status filter
                                        if (statusFilter !== "all") {
                                            bookingsToShow = bookingsToShow.filter(booking => booking.status === statusFilter);
                                        }
                                        
                                        if (bookingsToShow.length === 0) {
                                            return (
                                                <div style={{
                                                    textAlign: "center",
                                                    padding: "3rem",
                                                    color: "#9ca3af"
                                                }}>
                                                    <Calendar size={48} style={{ marginBottom: "1rem", opacity: 0.5, color: "#6b7280" }} />
                                                    <h3 style={{ marginBottom: "0.5rem", color: "#e5e7eb" }}>
                                                        No {dashboardFilter === "today" ? "Today's" : "Upcoming"} Bookings
                                                        {statusFilter !== "all" && ` (${statusFilter})`}
                                                    </h3>
                                                    <p style={{ color: "#9ca3af" }}>
                                                        {dashboardFilter === "today" 
                                                            ? "You don't have any bookings scheduled for today."
                                                            : "You don't have any upcoming bookings."
                                                        }
                                                        {statusFilter !== "all" && ` with status "${statusFilter}".`}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                                                gap: "1.5rem"
                                            }}>
                                                {bookingsToShow.map((booking) => {
                                                    const statusBadge = getStatusBadge(booking.status);
                                                    return (
                                                        <div
                                                            key={booking.id}
                                                            onClick={() => setSelectedBooking(booking)}
                                                            style={{
                                                                border: "1px solid #374151",
                                                                borderRadius: "12px",
                                                                padding: "1.5rem",
                                                                backgroundColor: "#374151",
                                                                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                                                                transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                                                                minHeight: "250px",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                cursor: "pointer"
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = "translateY(-2px)";
                                                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.4)";
                                                                e.currentTarget.style.borderColor = "#4b5563";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = "translateY(0)";
                                                                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
                                                                e.currentTarget.style.borderColor = "#374151";
                                                            }}
                                                        >
                                                            {/* Header */}
                                                            <div style={{ marginBottom: "1.25rem" }}>
                                                                <h3 style={{
                                                                    fontSize: "1.25rem",
                                                                    fontWeight: 600,
                                                                    marginBottom: "0.75rem",
                                                                    color: "#ffffff",
                                                                    lineHeight: "1.4"
                                                                }}>
                                                                    {booking.listingTitle || "Unknown Property"}
                                                                </h3>
                                                                <div style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: "0.5rem",
                                                                    padding: "0.375rem 0.875rem",
                                                                    borderRadius: "6px",
                                                                    backgroundColor: statusBadge.bgColor,
                                                                    color: statusBadge.color,
                                                                    fontSize: "0.875rem",
                                                                    fontWeight: 600
                                                                }}>
                                                                    {statusBadge.icon}
                                                                    {statusBadge.text}
                                                                </div>
                                                            </div>

                                                            {/* Booking Details */}
                                                            <div style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: "1rem",
                                                                marginBottom: "1.5rem",
                                                                flex: 1
                                                            }}>
                                                                <div style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "0.75rem",
                                                                    color: "#9ca3af"
                                                                }}>
                                                                    <Calendar size={18} style={{ flexShrink: 0, color: "#6b7280" }} />
                                                                    <span style={{ 
                                                                        fontSize: "0.9375rem",
                                                                        fontWeight: 500,
                                                                        color: "#e5e7eb"
                                                                    }}>
                                                                        {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "0.75rem",
                                                                    color: "#9ca3af"
                                                                }}>
                                                                    <Users size={18} style={{ flexShrink: 0, color: "#6b7280" }} />
                                                                    <span style={{ 
                                                                        fontSize: "0.9375rem",
                                                                        fontWeight: 500,
                                                                        color: "#e5e7eb"
                                                                    }}>
                                                                        {booking.guests || 1} guest{booking.guests > 1 ? "s" : ""}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "0.75rem",
                                                                    color: "#9ca3af"
                                                                }}>
                                                                    <MapPin size={18} style={{ flexShrink: 0, color: "#6b7280" }} />
                                                                    <span style={{ 
                                                                        fontSize: "0.9375rem",
                                                                        fontWeight: 500,
                                                                        color: "#e5e7eb",
                                                                        textTransform: "capitalize"
                                                                    }}>
                                                                        {booking.listingType || "Property"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Price Section */}
                                                            <div style={{
                                                                borderTop: "2px solid #4b5563",
                                                                paddingTop: "1rem",
                                                                marginTop: "auto"
                                                            }}>
                                                                <div style={{
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    alignItems: "flex-end",
                                                                    gap: "1rem"
                                                                }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{
                                                                            fontSize: "0.8125rem",
                                                                            color: "#9ca3af",
                                                                            marginBottom: "0.375rem",
                                                                            fontWeight: 500
                                                                        }}>
                                                                            Total Price
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: "1.5rem",
                                                                            fontWeight: 700,
                                                                            color: "#f87171"
                                                                        }}>
                                                                            ₱{booking.totalPrice?.toFixed(2) || "0.00"}
                                                                        </div>
                                                                    </div>
                                                                    {booking.paymentStatus && (
                                                                        <div style={{
                                                                            padding: "0.5rem 1rem",
                                                                            borderRadius: "8px",
                                                                            backgroundColor: booking.paymentStatus === "paid" ? "#065f46" : "#78350f",
                                                                            color: booking.paymentStatus === "paid" ? "#6ee7b7" : "#fcd34d",
                                                                            fontSize: "0.8125rem",
                                                                            fontWeight: 600,
                                                                            whiteSpace: "nowrap"
                                                                        }}>
                                                                            {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </section>
                        )}

                        {/* Add Property Modal */}
                        {showHostForm && (
                            <HostingType
                                onClose={() => setShowForm(false)}
                            />
                        )}

                        {/* Edit Modal */}
                        {showEditForm && selectedDest && (
                            <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
                                <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h2>Edit Property</h2>
                                        <button className="modal-close" onClick={() => setShowEditForm(false)}>
                                            <X />
                                        </button>
                                    </div>

                                    <form onSubmit={handleEditSubmit} className="edit-form">
                                        <div className="edit-form-group">
                                            <label htmlFor="edit-title">
                                                Title
                                            </label>
                                            <input
                                                id="edit-title"
                                                type="text"
                                                value={selectedDest.title}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, title: e.target.value })
                                                }
                                                placeholder="Enter property title"
                                                required
                                            />
                                        </div>

                                        <div className="edit-form-group">
                                            <label htmlFor="edit-location">
                                                Location
                                            </label>
                                            <input
                                                id="edit-location"
                                                type="text"
                                                value={typeof selectedDest.location === 'string'
                                                    ? selectedDest.location
                                                    : (selectedDest.location?.address || "")}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, location: e.target.value })
                                                }
                                                placeholder="Enter property location"
                                                required
                                            />
                                        </div>

                                        <div className="edit-form-group">
                                            <label htmlFor="edit-price">
                                                Price
                                            </label>
                                            <input
                                                id="edit-price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={selectedDest.price}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, price: parseFloat(e.target.value) })
                                                }
                                                placeholder="Enter price per night"
                                                required
                                            />
                                        </div>

                                        <div className="edit-form-group">
                                            <label htmlFor="edit-description">
                                                Description
                                            </label>
                                            <textarea
                                                id="edit-description"
                                                value={selectedDest.description}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, description: e.target.value })
                                                }
                                                placeholder="Enter property description"
                                                rows="5"
                                                required
                                            />
                                        </div>

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

                        {/* Booking Details Modal */}
                        {selectedBooking && (
                            <div 
                                className="modal-overlay" 
                                onClick={() => setSelectedBooking(null)}
                                style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 1000,
                                    padding: "2rem"
                                }}
                            >
                                <div 
                                    className="modal" 
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        backgroundColor: "#374151",
                                        borderRadius: "16px",
                                        padding: "2rem",
                                        maxWidth: "700px",
                                        width: "100%",
                                        maxHeight: "90vh",
                                        overflowY: "auto",
                                        border: "1px solid #4b5563",
                                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
                                        <div style={{ flex: 1 }}>
                                            <h2 style={{ 
                                                fontSize: "1.75rem", 
                                                fontWeight: 700, 
                                                marginBottom: "0.75rem",
                                                color: "#ffffff"
                                            }}>
                                                {selectedBooking.listingTitle || "Unknown Property"}
                                            </h2>
                                            <div style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                padding: "0.5rem 1rem",
                                                borderRadius: "8px",
                                                backgroundColor: getStatusBadge(selectedBooking.status).bgColor,
                                                color: getStatusBadge(selectedBooking.status).color,
                                                fontSize: "0.875rem",
                                                fontWeight: 600
                                            }}>
                                                {getStatusBadge(selectedBooking.status).icon}
                                                {getStatusBadge(selectedBooking.status).text}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedBooking(null)}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "#9ca3af",
                                                cursor: "pointer",
                                                padding: "0.5rem",
                                                borderRadius: "8px",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = "#4b5563";
                                                e.target.style.color = "#ffffff";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = "transparent";
                                                e.target.style.color = "#9ca3af";
                                            }}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>

                                    {/* Guest Information */}
                                    <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#1f2937", borderRadius: "12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                                            <User size={20} style={{ color: "#6b7280" }} />
                                            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#ffffff" }}>
                                                Guest Information
                                            </h3>
                                        </div>
                                        {loadingGuests[selectedBooking.guestId] ? (
                                            <div style={{ color: "#9ca3af", padding: "1rem 0" }}>
                                                Loading guest information...
                                            </div>
                                        ) : guestInfo[selectedBooking.guestId] ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                    <User size={16} style={{ color: "#6b7280" }} />
                                                    <span>
                                                        {`${guestInfo[selectedBooking.guestId].firstName || ""} ${guestInfo[selectedBooking.guestId].lastName || ""}`.trim() || 
                                                         guestInfo[selectedBooking.guestId].email || 
                                                         "Guest"}
                                                    </span>
                                                </div>
                                                {guestInfo[selectedBooking.guestId].email && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                        <Mail size={16} style={{ color: "#6b7280" }} />
                                                        <span>{guestInfo[selectedBooking.guestId].email}</span>
                                                    </div>
                                                )}
                                                {guestInfo[selectedBooking.guestId].phoneNumber && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                        <Phone size={16} style={{ color: "#6b7280" }} />
                                                        <span>{guestInfo[selectedBooking.guestId].phoneNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ color: "#9ca3af", fontStyle: "italic", padding: "1rem 0" }}>
                                                Guest Information Not Available
                                            </div>
                                        )}
                                    </div>

                                    {/* Booking Details */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem", color: "#ffffff" }}>
                                            Booking Details
                                        </h3>
                                        <div style={{ 
                                            display: "grid", 
                                            gridTemplateColumns: "repeat(2, 1fr)", 
                                            gap: "1rem",
                                            marginBottom: "1.5rem"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                <Calendar size={18} style={{ color: "#6b7280" }} />
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Check-in / Check-out</div>
                                                    <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                                                        {formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                <Users size={18} style={{ color: "#6b7280" }} />
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Guests</div>
                                                    <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                                                        {selectedBooking.guests || 1} guest{selectedBooking.guests > 1 ? "s" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                <MapPin size={18} style={{ color: "#6b7280" }} />
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Type</div>
                                                    <div style={{ fontSize: "0.9375rem", fontWeight: 500, textTransform: "capitalize" }}>
                                                        {selectedBooking.listingType || "Property"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#e5e7eb" }}>
                                                <DollarSign size={18} style={{ color: "#6b7280" }} />
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Nights</div>
                                                    <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                                                        {selectedBooking.nights || 0} night{selectedBooking.nights > 1 ? "s" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing Breakdown */}
                                        <div style={{ 
                                            padding: "1.5rem", 
                                            backgroundColor: "#1f2937", 
                                            borderRadius: "12px",
                                            borderTop: "2px solid #4b5563"
                                        }}>
                                            <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#ffffff" }}>
                                                Pricing Breakdown
                                            </h4>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                    <span style={{ fontSize: "0.875rem" }}>Price per Night</span>
                                                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                                        ₱{selectedBooking.pricePerNight?.toLocaleString() || "0"}
                                                    </span>
                                                </div>
                                                {selectedBooking.discountAmount > 0 && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                        <span style={{ fontSize: "0.875rem" }}>Discount</span>
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#10b981" }}>
                                                            -₱{selectedBooking.discountAmount?.toFixed(2) || "0.00"}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedBooking.serviceFee > 0 && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                        <span style={{ fontSize: "0.875rem" }}>Service Fee</span>
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                                            ₱{selectedBooking.serviceFee?.toFixed(2) || "0.00"}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedBooking.couponCode && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                        <span style={{ fontSize: "0.875rem" }}>Coupon Code</span>
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                                            {selectedBooking.couponCode}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ 
                                                    borderTop: "2px solid #4b5563", 
                                                    paddingTop: "0.75rem", 
                                                    marginTop: "0.5rem",
                                                    display: "flex",
                                                    justifyContent: "space-between"
                                                }}>
                                                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff" }}>Total Price</span>
                                                    <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f87171" }}>
                                                        ₱{selectedBooking.totalPrice?.toFixed(2) || "0.00"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Booking Date</span>
                                                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                                    {formatDate(selectedBooking.createdAt)}
                                                </span>
                                            </div>
                                            {selectedBooking.paymentStatus && (
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Payment Status</span>
                                                    <span style={{
                                                        padding: "0.25rem 0.75rem",
                                                        borderRadius: "6px",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                        backgroundColor: selectedBooking.paymentStatus === "paid" ? "#065f46" : "#78350f",
                                                        color: selectedBooking.paymentStatus === "paid" ? "#6ee7b7" : "#fcd34d"
                                                    }}>
                                                        {selectedBooking.paymentStatus === "paid" ? "Paid" : "Pending"}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedBooking.hostEarnings && (
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#e5e7eb" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Your Earnings</span>
                                                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#10b981" }}>
                                                        ₱{selectedBooking.hostEarnings?.toFixed(2) || "0.00"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </article>
                </main>

                <div className="floater-container">
                    <button className="icon-btn" onClick={() => setShowForm(true)}>
                        <Plus size={20} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => {
                            if (!currentUser) {
                                alert("Please log in to use chat.");
                                return;
                            }
                            openChat();
                        }}
                        title="Open Messages"
                    >
                        <MessageCircleMore size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Modal */}
            <ChatModal />

            <Footer />
        </>
    );
}
