import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Star, Heart, X, Share2, Users, Copy, Facebook, Twitter, Instagram } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";

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
import { useBooking } from "../../context/BookingContext.jsx";
import { useWallet } from "../../context/WalletContext.jsx";
import { usePoints } from "../../context/PointsContext.jsx";
import PayPalPayment from "../ui/PayPalPayment";
import ReviewList from "../ui/ReviewList";
import ReviewForm from "../ui/ReviewForm";
import ChatModal from "../ui/ChatModal";

function Body() {
    const [activeTab, setActiveTab] = useState("properties");
    const [selectedDest, setSelectedDest] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [filterGuests, setFilterGuests] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [numGuests, setNumGuests] = useState(1);
    const [availabilityMsg, setAvailabilityMsg] = useState("");
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("wallet"); // "wallet" or "paypal"
    const [bookingCreated, setBookingCreated] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const { checkAvailability, createBooking, creating } = useBooking();
    const { balance, pay, applyCoupon, loading: walletLoading } = useWallet();

    // Auto-check availability when dates change
    useEffect(() => {
        if (!selectedDest?.id || !startDate || !endDate) {
            setAvailabilityMsg("");
            return;
        }

        // Debounce availability check
        const timeoutId = setTimeout(async () => {
            setCheckingAvailability(true);
            try {
                const res = await checkAvailability(selectedDest.id, startDate, endDate);
                if (!res.available) {
                    setAvailabilityMsg(res.reason || "Dates not available");
                } else {
                    setAvailabilityMsg(""); // Clear message if dates are available
                }
            } catch (error) {
                console.error("Error checking availability:", error);
            } finally {
                setCheckingAvailability(false);
            }
        }, 500); // Wait 500ms after user stops typing/changing dates

        return () => clearTimeout(timeoutId);
    }, [startDate, endDate, selectedDest?.id, checkAvailability]);
    const { awardPoints } = usePoints();
    // Validation functions
    const validateBookingForm = () => {
        const errors = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check-in date validation
        if (!startDate) {
            errors.startDate = "Check-in date is required";
        } else {
            const checkIn = new Date(startDate);
            checkIn.setHours(0, 0, 0, 0);
            if (checkIn < today) {
                errors.startDate = "Check-in date cannot be in the past";
            }
        }

        // Check-out date validation
        if (!endDate) {
            errors.endDate = "Check-out date is required";
        } else if (startDate) {
            const checkIn = new Date(startDate);
            const checkOut = new Date(endDate);
            checkIn.setHours(0, 0, 0, 0);
            checkOut.setHours(0, 0, 0, 0);
            
            if (checkOut <= checkIn) {
                errors.endDate = "Check-out date must be after check-in date";
            }
        }

        // Guests validation
        if (!numGuests || numGuests < 1) {
            errors.numGuests = "At least 1 guest is required";
        } else if (numGuests > 20) {
            errors.numGuests = "Maximum 20 guests allowed";
        }

        // Price calculation validation
        if (startDate && endDate && selectedDest?.price) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            
            if (nights <= 0) {
                errors.dates = "Invalid date range";
            }
            
            const basePrice = (selectedDest.price || 0) * nights * (Number(numGuests) || 1);
            const listingDiscount = selectedDest.discountPercentage ? (basePrice * selectedDest.discountPercentage) / 100 : 0;
            const finalPrice = basePrice - listingDiscount - couponDiscount;
            
            if (finalPrice <= 0) {
                errors.price = "Invalid price calculation";
            }

            // Balance validation for wallet payment
            if (paymentMethod === "wallet" && balance < finalPrice) {
                errors.balance = `Insufficient balance. Required: ₱${finalPrice.toFixed(2)}, Available: ₱${balance.toFixed(2)}`;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Calculate total price
    const calculateTotalPrice = () => {
        if (!startDate || !endDate || !selectedDest?.price) return 0;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const basePrice = (selectedDest.price || 0) * nights * (Number(numGuests) || 1);
        const listingDiscount = selectedDest.discountPercentage ? (basePrice * selectedDest.discountPercentage) / 100 : 0;
        return basePrice - listingDiscount - couponDiscount;
    };

    // Award points after successful booking
    const awardBookingPoints = async (booking, totalPrice) => {
        if (!currentUser) return;

        try {
            // Check if this is user's first booking (exclude current booking)
            const bookingsQuery = query(
                collection(db, "bookings"),
                where("guestId", "==", currentUser.uid),
                where("status", "==", "confirmed")
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            // Filter out the current booking to check if it's truly the first
            const otherBookings = bookingsSnap.docs.filter(doc => doc.id !== booking.id);
            const isFirstBooking = otherBookings.length === 0;

            // Calculate base points (10 points per ₱100 spent)
            const basePoints = Math.floor((totalPrice / 100) * 10);

            // Award base points
            await awardPoints(
                basePoints,
                "booking",
                `Points earned from booking: ${booking.listingTitle || booking.listingId}`,
                booking.id
            );

            // Award first booking bonus
            if (isFirstBooking) {
                await awardPoints(
                    50,
                    "first_booking",
                    "First booking bonus!",
                    booking.id
                );
            } else {
                // Award repeat booking bonus
                await awardPoints(
                    20,
                    "bonus",
                    "Repeat booking bonus!",
                    booking.id
                );
            }
        } catch (error) {
            console.error("Error awarding points:", error);
            // Don't fail the booking if points awarding fails
        }
    };

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
    }, [activeTab]);

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
        let filtered = [...allProperties];

        // Filter by location/title
        if (searchQuery.trim()) {
            filtered = filtered.filter(
                (p) =>
                    p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by guest count
        if (filterGuests && Number(filterGuests) > 0) {
            filtered = filtered.filter(
                (p) => p.maxGuests && Number(p.maxGuests) >= Number(filterGuests)
            );
        }

        // Filter by date availability (basic check - can be enhanced with booking overlap)
        if (checkInDate && checkOutDate) {
            // For now, just show all properties (you can add booking overlap check here)
            // filtered = filtered.filter((p) => {
            //     // Check if dates overlap with existing bookings
            //     return true; // Placeholder
            // });
        }

        setProperties(filtered);
    };

    // ✅ Share functionality
    const getListingUrl = (listingId) => {
        return `${window.location.origin}/listing/${listingId}`;
    };

    const handleCopyLink = async (listingId) => {
        const url = getListingUrl(listingId);
        try {
            await navigator.clipboard.writeText(url);
            alert("Link copied to clipboard!");
            setShowShareMenu(false);
        } catch (e) {
            alert("Failed to copy link");
        }
    };

    const handleShareSocial = (platform, listingId) => {
        const url = encodeURIComponent(getListingUrl(listingId));
        const title = encodeURIComponent(selectedDest?.title || "Check out this listing!");
        const text = encodeURIComponent(`Check out ${selectedDest?.title || "this listing"} on Expora!`);

        let shareUrl = "";
        switch (platform) {
            case "facebook":
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case "twitter":
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case "instagram":
                // Instagram doesn't support direct URL sharing, show message
                alert("Copy the link and share it on Instagram!");
                handleCopyLink(listingId);
                return;
            default:
                return;
        }
        window.open(shareUrl, "_blank", "width=600,height=400");
        setShowShareMenu(false);
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
                                    type="date"
                                    placeholder="Check-in"
                                    className="search-input"
                                    value={checkInDate}
                                    onChange={(e) => setCheckInDate(e.target.value)}
                                />
                            </div>
                            <div className="search-input-group">
                                <Calendar size={20} className="search-icon" />
                                <input
                                    type="date"
                                    placeholder="Check-out"
                                    className="search-input"
                                    value={checkOutDate}
                                    onChange={(e) => setCheckOutDate(e.target.value)}
                                    min={checkInDate || undefined}
                                />
                            </div>
                            <div className="search-input-group">
                                <Users size={20} className="search-icon" />
                                <input
                                    type="number"
                                    placeholder="Guests"
                                    className="search-input"
                                    value={filterGuests}
                                    onChange={(e) => setFilterGuests(e.target.value)}
                                    min="1"
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

                        {/* DISCOVER TAB */}
                        {activeTab && (
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
                        {/* {activeTab === "experiences" && (
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
                        )} */}

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
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <h2 className="modal-title" style={{ margin: 0 }}>
                                            {selectedDest.title}{" "}
                                            <span className="modal-price">
                                                ₱{selectedDest.price?.toLocaleString()} / night
                                            </span>
                                        </h2>
                                        <div style={{ position: "relative" }}>
                                            <button
                                                onClick={() => setShowShareMenu(!showShareMenu)}
                                                className="icon-btn"
                                                style={{ padding: 8 }}
                                            >
                                                <Share2 size={20} />
                                            </button>
                                            {showShareMenu && (
                                                <div style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    top: 40,
                                                    background: "white",
                                                    border: "1px solid #ccc",
                                                    borderRadius: 8,
                                                    padding: 8,
                                                    zIndex: 1000,
                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                                    minWidth: 180
                                                }}>
                                                    <button
                                                        onClick={() => handleCopyLink(selectedDest.id)}
                                                        style={{ width: "100%", padding: 8, textAlign: "left", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}
                                                    >
                                                        <Copy size={16} /> Copy Link
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareSocial("facebook", selectedDest.id)}
                                                        style={{ width: "100%", padding: 8, textAlign: "left", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}
                                                    >
                                                        <Facebook size={16} /> Facebook
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareSocial("twitter", selectedDest.id)}
                                                        style={{ width: "100%", padding: 8, textAlign: "left", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}
                                                    >
                                                        <Twitter size={16} /> Twitter
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareSocial("instagram", selectedDest.id)}
                                                        style={{ width: "100%", padding: 8, textAlign: "left", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer" }}
                                                    >
                                                        <Instagram size={16} /> Instagram
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="modal-location">
                                        <MapPin size={14} /> {selectedDest.location}
                                    </p>
                                    {/* Discount/Promo display */}
                                    {selectedDest.discountPercentage && (
                                        <div style={{ background: "#ff6b35", color: "white", padding: 8, borderRadius: 4, marginTop: 8, display: "inline-block" }}>
                                            {selectedDest.discountPercentage}% OFF
                                            {selectedDest.promoCode && ` - Use code: ${selectedDest.promoCode}`}
                                        </div>
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

                                    {/* Booking inputs */}
                                    <div className="booking-inputs" style={{ display: "grid", gap: 8, marginTop: 12 }}>
                                        <div style={{ display: "grid", gap: 4 }}>
                                            <label>Check-in <span style={{ color: "#ff4444" }}>*</span></label>
                                            <input 
                                                type="date" 
                                                value={startDate} 
                                                onChange={(e) => {
                                                    setStartDate(e.target.value);
                                                    setValidationErrors({ ...validationErrors, startDate: "" });
                                                    // Reset end date if it's before new check-in
                                                    if (endDate && e.target.value && new Date(e.target.value) >= new Date(endDate)) {
                                                        setEndDate("");
                                                    }
                                                }}
                                                min={new Date().toISOString().split('T')[0]}
                                                style={{ 
                                                    borderColor: validationErrors.startDate ? "#ff4444" : undefined 
                                                }}
                                            />
                                            {validationErrors.startDate && (
                                                <span style={{ color: "#ff4444", fontSize: "0.875rem" }}>
                                                    {validationErrors.startDate}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "grid", gap: 4 }}>
                                            <label>Check-out <span style={{ color: "#ff4444" }}>*</span></label>
                                            <input 
                                                type="date" 
                                                value={endDate} 
                                                onChange={(e) => {
                                                    setEndDate(e.target.value);
                                                    setValidationErrors({ ...validationErrors, endDate: "" });
                                                }} 
                                                min={startDate || new Date().toISOString().split('T')[0]}
                                                style={{ 
                                                    borderColor: validationErrors.endDate ? "#ff4444" : undefined 
                                                }}
                                            />
                                            {validationErrors.endDate && (
                                                <span style={{ color: "#ff4444", fontSize: "0.875rem" }}>
                                                    {validationErrors.endDate}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "grid", gap: 4 }}>
                                            <label>Guests <span style={{ color: "#ff4444" }}>*</span></label>
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={20}
                                                value={numGuests} 
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || "";
                                                    setNumGuests(value);
                                                    setValidationErrors({ ...validationErrors, numGuests: "" });
                                                }}
                                                style={{ 
                                                    borderColor: validationErrors.numGuests ? "#ff4444" : undefined 
                                                }}
                                            />
                                            {validationErrors.numGuests && (
                                                <span style={{ color: "#ff4444", fontSize: "0.875rem" }}>
                                                    {validationErrors.numGuests}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "grid", gap: 4 }}>
                                            <label>Coupon Code (Optional)</label>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Enter code"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    style={{ flex: 1 }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (!couponCode) return;
                                                        try {
                                                            const start = new Date(startDate);
                                                            const end = new Date(endDate);
                                                            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                            const basePrice = (selectedDest.price || 0) * nights * (Number(numGuests) || 1);
                                                            const discount = await applyCoupon(couponCode, basePrice);
                                                            setCouponDiscount(discount);
                                                            alert(`Coupon applied! Discount: ₱${discount.toFixed(2)}`);
                                                        } catch (e) {
                                                            alert(e.message || "Invalid coupon");
                                                            setCouponDiscount(0);
                                                        }
                                                    }}
                                                    disabled={!startDate || !endDate}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                        {/* Price breakdown */}
                                        {startDate && endDate && selectedDest.price && (
                                            <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, background: "#f9f9f9" }}>
                                                <h4>Price Breakdown</h4>
                                                {(() => {
                                                    const start = new Date(startDate);
                                                    const end = new Date(endDate);
                                                    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                    const basePrice = (selectedDest.price || 0) * nights * (Number(numGuests) || 1);
                                                    const listingDiscount = selectedDest.discountPercentage ? (basePrice * selectedDest.discountPercentage) / 100 : 0;
                                                    const finalPrice = basePrice - listingDiscount - couponDiscount;
                                                    return (
                                                        <>
                                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                                                                <span>₱{selectedDest.price?.toLocaleString()} × {nights} nights × {numGuests} guests</span>
                                                                <span>₱{basePrice.toLocaleString()}</span>
                                                            </div>
                                                            {listingDiscount > 0 && (
                                                                <div style={{ display: "flex", justifyContent: "space-between", color: "green" }}>
                                                                    <span>Listing discount ({selectedDest.discountPercentage}%)</span>
                                                                    <span>-₱{listingDiscount.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            {couponDiscount > 0 && (
                                                                <div style={{ display: "flex", justifyContent: "space-between", color: "green" }}>
                                                                    <span>Coupon discount</span>
                                                                    <span>-₱{couponDiscount.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 8, paddingTop: 8, borderTop: "1px solid #ddd" }}>
                                                                <span>Total</span>
                                                                <span>₱{finalPrice.toFixed(2)}</span>
                                                            </div>
                                                            <div style={{ marginTop: 8, fontSize: "0.9em", color: "#666" }}>
                                                                Your balance: ₱{balance.toLocaleString()}
                                                                {paymentMethod === "wallet" && finalPrice > balance && (
                                                                    <span style={{ color: "#ff4444", display: "block", marginTop: 4 }}>
                                                                        Insufficient balance. Need ₱{(finalPrice - balance).toFixed(2)} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        {/* Validation errors - only show after button click */}
                                        {showValidationErrors && Object.keys(validationErrors).length > 0 && (
                                            <div style={{ 
                                                padding: "12px", 
                                                borderRadius: "8px", 
                                                background: "rgb(255, 230, 230)", 
                                                border: "1px solid rgb(255, 68, 68)",
                                                marginTop: "8px"
                                            }}>
                                                <strong style={{ color: "#ff4444", display: "block", marginBottom: "8px" }}>
                                                    Please fix the following errors:
                                                </strong>
                                                <ul style={{ margin: 0, paddingLeft: "20px", color: "#ff4444" }}>
                                                    {Object.values(validationErrors).map((error, index) => (
                                                        <li key={index} style={{ marginBottom: "4px" }}>{error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {checkingAvailability && (
                                            <div style={{ 
                                                color: "#666",
                                                padding: "8px",
                                                borderRadius: "4px",
                                                background: "#f0f0f0",
                                                marginTop: "8px",
                                                fontSize: "0.875rem"
                                            }}>
                                                Checking availability...
                                            </div>
                                        )}
                                        {availabilityMsg && !checkingAvailability && (
                                            <div style={{ 
                                                color: availabilityMsg.startsWith("Available") || availabilityMsg.includes("successfully") || availabilityMsg.includes("confirmed") ? "green" : "crimson",
                                                padding: "8px",
                                                borderRadius: "4px",
                                                background: availabilityMsg.startsWith("Available") || availabilityMsg.includes("successfully") || availabilityMsg.includes("confirmed") ? "#e6ffe6" : "#ffe6e6",
                                                marginTop: "8px",
                                                fontSize: "0.875rem"
                                            }}>
                                                {availabilityMsg}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Method Selection */}
                                    {startDate && endDate && selectedDest.price && (
                                        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                                            <h4 style={{ marginBottom: 12 }}>Payment Method</h4>
                                            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                                                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="wallet"
                                                        checked={paymentMethod === "wallet"}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                    />
                                                    <span>E-Wallet (Balance: ₱{balance.toLocaleString()})</span>
                                                </label>
                                                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="paypal"
                                                        checked={paymentMethod === "paypal"}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                    />
                                                    <span>PayPal</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* PayPal Payment Component */}
                                    {paymentMethod === "paypal" && startDate && endDate && selectedDest.price && bookingCreated && (
                                        <div style={{ marginTop: 16 }}>
                                            <PayPalPayment
                                                amount={(() => {
                                                    const start = new Date(startDate);
                                                    const end = new Date(endDate);
                                                    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                    const basePrice = (selectedDest.price || 0) * nights * (Number(numGuests) || 1);
                                                    const listingDiscount = selectedDest.discountPercentage ? (basePrice * selectedDest.discountPercentage) / 100 : 0;
                                                    return basePrice - listingDiscount - couponDiscount;
                                                })()}
                                                bookingId={bookingCreated.id}
                                                couponCode={couponCode || null}
                                                onSuccess={async (result) => {
                                                    // Award points after successful PayPal payment
                                                    if (bookingCreated) {
                                                        await awardBookingPoints(bookingCreated, bookingCreated.totalPrice);
                                                    }
                                                    setAvailabilityMsg(`Booking confirmed! PayPal payment successful (Order ID: ${result.orderId})`);
                                                    setCouponCode("");
                                                    setCouponDiscount(0);
                                                    setBookingCreated(null);
                                                    setTimeout(() => {
                                                        setShowDetail(false);
                                                    }, 2000);
                                                }}
                                                onError={(error) => {
                                                    setAvailabilityMsg(`PayPal payment failed: ${error.message || "Please try again"}`);
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Reviews Section */}
                                    <div className="reviews" style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #e0e0e0" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                            <h4 style={{ margin: 0 }}>Reviews</h4>
                                            {currentUser && (
                                                <button
                                                    onClick={() => setShowReviewForm(true)}
                                                    style={{
                                                        padding: "8px 16px",
                                                        background: "#007bff",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        fontSize: "14px"
                                                    }}
                                                >
                                                    Write a Review
                                                </button>
                                            )}
                                        </div>
                                        <ReviewList listingId={selectedDest.id} showAll={false} />
                                    </div>

                                    {showReviewForm && (
                                        <ReviewForm
                                            listingId={selectedDest.id}
                                            onClose={() => setShowReviewForm(false)}
                                            onSuccess={() => {
                                                setShowReviewForm(false);
                                                // Refresh reviews
                                                window.location.reload();
                                            }}
                                        />
                                    )}

                                    <div className="modal-actions">
                                        {paymentMethod === "wallet" ? (
                                            <button
                                                className="book-btn"
                                                disabled={!startDate || !endDate || !numGuests || numGuests < 1 || creating || walletLoading}
                                                onClick={async () => {
                                                    if (!currentUser) { 
                                                        alert("Please log in to book."); 
                                                        return; 
                                                    }
                                                    
                                                    // Validate form before proceeding
                                                    if (!validateBookingForm()) {
                                                        setShowValidationErrors(true);
                                                        setAvailabilityMsg("Please fix the validation errors before booking.");
                                                        return;
                                                    }
                                                    setShowValidationErrors(false);

                                                    setAvailabilityMsg("");
                                                    
                                                    try {
                                                        // Check availability
                                                        const res = await checkAvailability(selectedDest.id, startDate, endDate);
                                                        if (!res.available) { 
                                                            setAvailabilityMsg(res.reason || "Not available"); 
                                                            return; 
                                                        }

                                                        // Calculate final price
                                                        const finalPrice = calculateTotalPrice();
                                                        
                                                        // Validate balance
                                                        if (balance < finalPrice) {
                                                            setAvailabilityMsg(`Insufficient balance. Required: ₱${finalPrice.toFixed(2)}, Available: ₱${balance.toFixed(2)}`);
                                                            return;
                                                        }

                                                        // Create booking first
                                                        const booking = await createBooking({
                                                            listing: selectedDest,
                                                            guestUser: currentUser,
                                                            startDate,
                                                            endDate,
                                                            guests: numGuests,
                                                            couponCode: couponCode || null,
                                                        });

                                                        // Process payment
                                                        try {
                                                            await pay(booking.totalPrice, booking.id, couponCode || null);
                                                            // Award points after successful payment
                                                            await awardBookingPoints(booking, booking.totalPrice);
                                                            setAvailabilityMsg(`Booking confirmed! Payment of ₱${booking.totalPrice.toFixed(2)} processed.`);
                                                            setCouponCode("");
                                                            setCouponDiscount(0);
                                                            setValidationErrors({});
                                                            setTimeout(() => {
                                                                setShowDetail(false);
                                                            }, 2000);
                                                        } catch (payError) {
                                                            setAvailabilityMsg(`Booking created but payment failed: ${payError.message}`);
                                                        }
                                                    } catch (err) {
                                                        setAvailabilityMsg(err?.message || "Booking failed");
                                                    }
                                                }}
                                            >
                                                {creating ? "Processing..." : "Book & Pay Now (Wallet)"}
                                            </button>
                                        ) : (
                                            <button
                                                className="book-btn"
                                                disabled={!startDate || !endDate || !numGuests || numGuests < 1 || creating || bookingCreated}
                                                onClick={async () => {
                                                    if (!currentUser) { 
                                                        alert("Please log in to book."); 
                                                        return; 
                                                    }
                                                    
                                                    // Validate form before proceeding
                                                    if (!validateBookingForm()) {
                                                        setShowValidationErrors(true);
                                                        setAvailabilityMsg("Please fix the validation errors before booking.");
                                                        return;
                                                    }
                                                    setShowValidationErrors(false);

                                                    setAvailabilityMsg("");
                                                    
                                                    try {
                                                        // Check availability
                                                        const res = await checkAvailability(selectedDest.id, startDate, endDate);
                                                        if (!res.available) { 
                                                            setAvailabilityMsg(res.reason || "Not available"); 
                                                            return; 
                                                        }

                                                        // Create booking first (payment will be processed via PayPal)
                                                        const booking = await createBooking({
                                                            listing: selectedDest,
                                                            guestUser: currentUser,
                                                            startDate,
                                                            endDate,
                                                            guests: numGuests,
                                                            couponCode: couponCode || null,
                                                        });

                                                        setBookingCreated(booking);
                                                        setValidationErrors({});
                                                        setAvailabilityMsg("Booking created. Please complete PayPal payment below.");
                                                    } catch (err) {
                                                        setAvailabilityMsg(err?.message || "Booking failed");
                                                    }
                                                }}
                                            >
                                                {creating ? "Creating Booking..." : "Create Booking & Pay with PayPal"}
                                            </button>
                                        )}
                                        <button className="close-btn" onClick={() => {
                                            setShowDetail(false);
                                            setCouponCode("");
                                            setCouponDiscount(0);
                                            setBookingCreated(null);
                                            setPaymentMethod("wallet");
                                            setValidationErrors({});
                                            setStartDate("");
                                            setEndDate("");
                                            setNumGuests(1);
                                            setAvailabilityMsg("");
                                            setCheckingAvailability(false);
                                            setShowValidationErrors(false);
                                        }}>
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Modal - Rendered in body */}
            <ChatModal />
        </>
    );
}

export default Body;
