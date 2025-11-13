import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { MapPin, X, Share2, MessageCircle, Heart, Star } from "lucide-react";
import MapViewer from "./MapViewer";
import AvailabilityCalendar from "./AvailabilityCalendar";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import ShareMenu from "./ShareMenu";
import { useBooking } from "../../context/BookingContext";
import { useWallet } from "../../context/WalletContext";
import { usePoints } from "../../context/PointsContext";
import { useChat } from "../../context/ChatContext";
import PayPalPayment from "./PayPalPayment";
import Header from "../UserFolder/Header";
import "../cssFile/temp.css";

export default function SharedListing({ listing: propListing }) {
    const { id, category } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(propListing || null);
    const [loading, setLoading] = useState(!propListing);
    const [currentUser, setCurrentUser] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [numGuests, setNumGuests] = useState(1);
    const [availabilityMsg, setAvailabilityMsg] = useState("");
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("wallet");
    const [bookingCreated, setBookingCreated] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [serviceFee, setServiceFee] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const { checkAvailability, createBooking, creating, calculateServiceFee } = useBooking();
    const { balance, pay, applyCoupon, loading: walletLoading } = useWallet();
    const { openChat } = useChat();
    const { awardPoints } = usePoints();

    // Fetch listing from Firestore if ID is provided
    useEffect(() => {
        if (propListing) {
            setListing(propListing);
            setLoading(false);
            return;
        }

        if (!id) {
            setLoading(false);
            return;
        }

        const fetchListing = async () => {
            try {
                setLoading(true);
                console.log("Fetching listing - ID:", id, "Category:", category);
                
                // If category is provided, try that first
                if (category) {
                    console.log(`Trying to fetch from collection: ${category}`);
                    const listingRef = doc(db, category, id);
                    const listingSnap = await getDoc(listingRef);
                    
                    if (listingSnap.exists()) {
                        console.log("Listing found in category:", category);
                        setListing({
                            id: listingSnap.id,
                            category: category,
                            ...listingSnap.data()
                        });
                        setLoading(false);
                        return;
                    } else {
                        console.log(`Listing not found in ${category}, searching other collections...`);
                    }
                }
                
                // If not found with category or category not provided, search across all collections
                const collections = ["properties", "services", "experiences"];
                console.log("Searching across collections:", collections);
                for (const coll of collections) {
                    try {
                        // Skip if we already tried this category
                        if (category === coll) continue;
                        
                        const listingRef = doc(db, coll, id);
                        const listingSnap = await getDoc(listingRef);
                        
                        if (listingSnap.exists()) {
                            console.log(`Listing found in collection: ${coll}`);
                            setListing({
                                id: listingSnap.id,
                                category: coll,
                                ...listingSnap.data()
                            });
                            setLoading(false);
                            return;
                        }
                    } catch (err) {
                        console.warn(`Error checking ${coll}:`, err);
                        continue;
                    }
                }
                
                // If we get here, listing wasn't found in any collection
                console.error("Listing not found in any collection. ID:", id, "Category:", category);
                setListing(null);
            } catch (error) {
                console.error("Error fetching listing:", error);
                setListing(null);
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id, category, propListing]);

    // Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch favorites
    useEffect(() => {
        if (!currentUser || !listing?.id) {
            setFavorites([]);
            return;
        }
        
        const fetchFavorites = async () => {
            try {
                const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
                const favSnap = await getDocs(q);
                const favoriteIds = favSnap.docs.map((doc) => doc.data().propertyId);
                setFavorites(favoriteIds);
            } catch (error) {
                console.error("Error loading favorites:", error);
            }
        };
        
        fetchFavorites();
    }, [currentUser, listing?.id]);

    // Auto-check availability when dates change
    useEffect(() => {
        if (!listing?.id || !startDate || !endDate) {
            setAvailabilityMsg("");
            return;
        }

        const timeoutId = setTimeout(async () => {
            setCheckingAvailability(true);
            try {
                const res = await checkAvailability(listing.id, startDate, endDate);
                if (!res.available) {
                    setAvailabilityMsg(res.reason || "Dates not available");
                } else {
                    setAvailabilityMsg("");
                }
            } catch (error) {
                console.error("Error checking availability:", error);
            } finally {
                setCheckingAvailability(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [startDate, endDate, listing?.id, checkAvailability]);

    // Calculate service fee
    useEffect(() => {
        const calculateFee = async () => {
            if (!startDate || !endDate || !listing?.price) {
                setServiceFee(0);
                return;
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const basePrice = (listing.price || 0) * nights * (Number(numGuests) || 1);
            const listingDiscount = listing.discountPercentage ? (basePrice * listing.discountPercentage) / 100 : 0;
            const priceAfterListingDiscount = basePrice - listingDiscount;
            
            if (priceAfterListingDiscount > 0) {
                const fee = await calculateServiceFee(priceAfterListingDiscount);
                setServiceFee(fee);
            } else {
                setServiceFee(0);
            }
        };
        
        calculateFee();
    }, [startDate, endDate, listing?.price, listing?.discountPercentage, numGuests, calculateServiceFee]);

    // Validation functions
    const validateBookingForm = () => {
        const errors = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!startDate) {
            errors.startDate = "Check-in date is required";
        } else {
            const checkIn = new Date(startDate);
            checkIn.setHours(0, 0, 0, 0);
            if (checkIn < today) {
                errors.startDate = "Check-in date cannot be in the past";
            }
        }

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

        if (!numGuests || numGuests < 1) {
            errors.numGuests = "At least 1 guest is required";
        } else if (numGuests > 20) {
            errors.numGuests = "Maximum 20 guests allowed";
        }

        if (startDate && endDate && listing?.price) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const basePrice = (listing.price || 0) * nights * (Number(numGuests) || 1);
            const listingDiscount = listing.discountPercentage ? (basePrice * listing.discountPercentage) / 100 : 0;
            const priceAfterListingDiscount = basePrice - listingDiscount;
            const totalPrice = priceAfterListingDiscount + serviceFee;
            const finalPrice = totalPrice - couponDiscount;
            
            if (paymentMethod === "wallet" && finalPrice > 0 && balance < finalPrice) {
                errors.balance = `Insufficient balance. Required: ₱${finalPrice.toFixed(2)}, Available: ₱${balance.toFixed(2)}`;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const calculateTotalPrice = () => {
        if (!startDate || !endDate || !listing?.price) return 0;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const basePrice = (listing.price || 0) * nights * (Number(numGuests) || 1);
        const listingDiscount = listing.discountPercentage ? (basePrice * listing.discountPercentage) / 100 : 0;
        const priceAfterListingDiscount = basePrice - listingDiscount;
        return priceAfterListingDiscount + serviceFee;
    };

    const awardBookingPoints = async (booking, totalPrice) => {
        if (!currentUser) return;

        try {
            const bookingsQuery = query(
                collection(db, "bookings"),
                where("guestId", "==", currentUser.uid),
                where("status", "==", "confirmed")
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            const otherBookings = bookingsSnap.docs.filter(doc => doc.id !== booking.id);
            const isFirstBooking = otherBookings.length === 0;

            const basePoints = Math.floor((totalPrice / 100) * 10);

            await awardPoints(
                basePoints,
                "booking",
                `Points earned from booking: ${booking.listingTitle || booking.listingId}`,
                booking.id
            );

            if (isFirstBooking) {
                await awardPoints(50, "first_booking", "First booking bonus!", booking.id);
            } else {
                await awardPoints(20, "bonus", "Repeat booking bonus!", booking.id);
            }
        } catch (error) {
            console.error("Error awarding points:", error);
        }
    };

    const handleFavBtn = async () => {
        if (!currentUser) {
            alert("Please log in to save favorites.");
            return;
        }
        if (!listing) return;

        try {
            const favDocRef = doc(db, "favorites", `${currentUser.uid}_${listing.id}`);
            const favDoc = await getDoc(favDocRef);

            const category = listing.category || "properties";

            if (favDoc.exists()) {
                await deleteDoc(favDocRef);
                setFavorites((prev) => prev.filter((id) => id !== listing.id));
                alert("Removed from favorites 💔");
            } else {
                await setDoc(favDocRef, {
                    userId: currentUser.uid,
                    propertyId: listing.id,
                    propertyData: listing,
                    category: category,
                    createdAt: new Date(),
                });
                setFavorites((prev) => [...prev, listing.id]);
                alert("Added to favorites ❤️");
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    const isFavorited = () => {
        return listing?.id && favorites.includes(listing.id);
    };

    const getListingUrl = (listingId, listingCategory = null) => {
        const category = listingCategory || listing?.category || "properties";
        return `${window.location.origin}/listing/${category}/${listingId}`;
    };

    const handleShare = async () => {
        if (!listing?.id) return;
        const url = getListingUrl(listing.id, listing.category);
        const title = listing?.title || "Check out this listing!";
        const text = `Check out ${listing?.title || "this listing"} on Expora!`;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                setShowShareMenu(false);
                return;
            } catch (err) {
                // Fallback to menu
            }
        }
        setShowShareMenu((prev) => !prev);
    };

    const handleCopyLink = async () => {
        if (!listing?.id) return;
        const url = getListingUrl(listing.id, listing.category);
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                const temp = document.createElement("textarea");
                temp.value = url;
                temp.style.position = "fixed";
                temp.style.left = "-9999px";
                document.body.appendChild(temp);
                temp.focus();
                temp.select();
                document.execCommand("copy");
                document.body.removeChild(temp);
            }
            alert("Link copied to clipboard!");
            setShowShareMenu(false);
        } catch (e) {
            alert("Failed to copy link");
        }
    };

    const handleShareSocial = (platform) => {
        if (!listing?.id) return;
        const url = encodeURIComponent(getListingUrl(listing.id, listing.category));
        const title = encodeURIComponent(listing?.title || "Check out this listing!");
        const text = encodeURIComponent(`Check out ${listing?.title || "this listing"} on Expora!`);

        let shareUrl = "";
        switch (platform) {
            case "facebook":
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case "twitter":
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case "instagram":
                alert("Copy the link and share it on Instagram!");
                handleCopyLink();
                return;
            default:
                return;
        }
        window.open(shareUrl, "_blank", "width=600,height=400");
        setShowShareMenu(false);
    };

    if (loading) {
        return (
            <>
                {!propListing && <Header />}
                <div className="homepage" style={{ padding: "40px", textAlign: "center" }}>
                    <p>Loading listing...</p>
                </div>
            </>
        );
    }

    if (!listing && !loading) {
        return (
            <>
                {!propListing && <Header />}
                <div className="homepage" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text, #ffffff)", marginBottom: "8px" }}>
                        Listing not found.
                    </p>
                    {id && (
                        <p style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", fontSize: "0.9rem", marginBottom: "16px" }}>
                            ID: {id} {category && `| Category: ${category}`}
                        </p>
                    )}
                    {!id && (
                        <p style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", fontSize: "0.9rem", marginBottom: "16px" }}>
                            No listing ID provided in URL.
                        </p>
                    )}
                    {!propListing && (
                        <button onClick={() => navigate("/Home")} style={{
                            marginTop: "20px",
                            padding: "10px 20px",
                            background: "var(--primary-gradient)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }}>
                            Go Home
                        </button>
                    )}
                </div>
            </>
        );
    }

    const locationStr = listing.location?.address || listing.location || "Location not specified";
    const amenities = Array.isArray(listing.amenities) ? listing.amenities : 
                     (typeof listing.amenities === 'string' ? listing.amenities.split(',').map(a => a.trim()) : []);
    const images = Array.isArray(listing.images) ? listing.images : [];

    return (
        <>
            {!propListing && <Header />}
            <div className="homepage">
                <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
                    {/* Image Gallery */}
                    {images.length > 0 && (
                        <div style={{ marginBottom: "32px" }}>
                            <img
                                src={images[0]}
                                alt={listing.title}
                                style={{
                                    width: "100%",
                                    height: "500px",
                                    objectFit: "cover",
                                    borderRadius: "12px"
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "40px", marginBottom: "40px" }}>
                        {/* Main Content */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "var(--text, #ffffff)", margin: 0 }}>
                                    {listing.title}
                                </h1>
                                <div style={{ display: "flex", gap: "8px", position: "relative" }}>
                                    <button
                                        onClick={handleFavBtn}
                                        className="icon-btn"
                                        style={{ padding: 8 }}
                                        title="Add to favorites"
                                    >
                                        <Heart 
                                            size={20} 
                                            fill={isFavorited() ? "#ff6b35" : "none"}
                                            color={isFavorited() ? "#ff6b35" : "currentColor"}
                                        />
                                    </button>
                                    {listing.ownerId && currentUser && currentUser.uid !== listing.ownerId && (
                                        <button
                                            onClick={() => openChat(listing.ownerId)}
                                            className="icon-btn"
                                            style={{ padding: 8 }}
                                            title="Message host"
                                        >
                                            <MessageCircle size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleShare}
                                        className="icon-btn"
                                        style={{ padding: 8 }}
                                        title="Share"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                    {showShareMenu && (
                                        <ShareMenu
                                            listingId={listing.id}
                                            onCopyLink={handleCopyLink}
                                            onShareSocial={handleShareSocial}
                                            position={{ right: 0, top: 40 }}
                                        />
                                    )}
                                </div>
                            </div>

                            <p style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <MapPin size={16} /> {locationStr}
                            </p>

                            {/* Map Viewer */}
                            {listing.location && listing.location.lat && listing.location.lng && (
                                <MapViewer 
                                    location={listing.location} 
                                    propertyTitle={listing.title}
                                />
                            )}

                            {/* Discount/Promo display */}
                            {listing.discountPercentage && (
                                <div style={{ 
                                    background: "var(--primary-gradient, linear-gradient(135deg, #ff6b35 0%, #f7931e 100%))", 
                                    color: "var(--text, #ffffff)", 
                                    padding: "8px 12px", 
                                    borderRadius: "var(--radius-sm, 4px)", 
                                    marginTop: "8px", 
                                    marginBottom: "16px",
                                    display: "inline-block",
                                    fontWeight: "600",
                                    fontSize: "0.9rem",
                                    boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)"
                                }}>
                                    {listing.discountPercentage}% OFF
                                    {listing.promoCode && ` - Use code: ${listing.promoCode}`}
                                </div>
                            )}

                            <p style={{ color: "var(--text, #ffffff)", lineHeight: "1.6", marginBottom: "16px" }}>
                                {listing.description}
                            </p>

                            {/* Amenities */}
                            {amenities.length > 0 && (
                                <div style={{ marginBottom: "24px" }}>
                                    <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "var(--text, #ffffff)" }}>
                                        Amenities
                                    </h3>
                                    <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                                        {amenities.map((item, i) => (
                                            <li key={i} style={{ color: "var(--text, #ffffff)" }}>• {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Property Details */}
                            <div style={{ display: "flex", gap: "24px", marginBottom: "24px", flexWrap: "wrap" }}>
                                {listing.maxGuests && (
                                    <div>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Max Guests:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.maxGuests}</span>
                                    </div>
                                )}
                                {listing.bedrooms && (
                                    <div>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Bedrooms:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.bedrooms}</span>
                                    </div>
                                )}
                                {listing.bathrooms && (
                                    <div>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Bathrooms:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.bathrooms}</span>
                                    </div>
                                )}
                            </div>

                            {/* Availability Calendar */}
                            {listing?.id && (
                                <div style={{ marginTop: 24, marginBottom: 24 }}>
                                    <h3 style={{ marginBottom: 12, fontSize: "1.1rem", fontWeight: 600, color: "var(--text, #ffffff)" }}>
                                        Availability Calendar
                                    </h3>
                                    <AvailabilityCalendar 
                                        listingId={listing.id}
                                        initialStartDate={startDate}
                                        initialEndDate={endDate}
                                        onDateSelect={(dates) => {
                                            if (dates.start) {
                                                setStartDate(dates.start.toISOString().split('T')[0]);
                                                const { startDate: _, ...rest } = validationErrors;
                                                setValidationErrors(rest);
                                            }
                                            if (dates.end) {
                                                setEndDate(dates.end.toISOString().split('T')[0]);
                                                const { endDate: _, ...rest } = validationErrors;
                                                setValidationErrors(rest);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Reviews Section */}
                            <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                    <h3 style={{ margin: 0, color: "var(--text, #ffffff)" }}>Reviews</h3>
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
                                <ReviewList listingId={listing.id} showAll={false} propertyImages={images} />
                            </div>
                        </div>

                        {/* Booking Sidebar */}
                        <div style={{
                            position: "sticky",
                            top: "20px",
                            height: "fit-content",
                            background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                            padding: "24px",
                            borderRadius: "12px",
                            border: "1px solid var(--border, rgba(255, 255, 255, 0.1))"
                        }}>
                            <div style={{ marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "24px", fontWeight: "bold", color: "var(--text, #ffffff)" }}>
                                        ₱{listing.price?.toLocaleString()}
                                    </span>
                                    <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>
                                        {listing.day_night || "/ night"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "16px" }}>
                                    <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                    <span style={{ color: "var(--text, #ffffff)" }}>4.8</span>
                                </div>
                            </div>

                            {/* Booking inputs */}
                            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: 4, color: "var(--text, #ffffff)", fontWeight: "500" }}>
                                        Check-in <span style={{ color: "var(--error, #ef4444)" }}>*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            const { startDate: _, ...rest } = validationErrors;
                                            setValidationErrors(rest);
                                            if (endDate && e.target.value && new Date(e.target.value) >= new Date(endDate)) {
                                                setEndDate("");
                                                const { endDate: __, ...rest2 } = rest;
                                                setValidationErrors(rest2);
                                            }
                                        }}
                                        min={new Date().toISOString().split('T')[0]}
                                        style={{ 
                                            width: "100%",
                                            padding: "10px",
                                            border: `1px solid ${validationErrors.startDate ? "var(--error, #ef4444)" : "var(--border, rgba(255, 255, 255, 0.1))"}`,
                                            borderRadius: "8px",
                                            background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                            color: "var(--text, #ffffff)"
                                        }}
                                    />
                                    {validationErrors.startDate && (
                                        <span style={{ color: "var(--error, #ef4444)", fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                                            {validationErrors.startDate}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: 4, color: "var(--text, #ffffff)", fontWeight: "500" }}>
                                        Check-out <span style={{ color: "var(--error, #ef4444)" }}>*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            const { endDate: _, ...rest } = validationErrors;
                                            setValidationErrors(rest);
                                        }} 
                                        min={startDate || new Date().toISOString().split('T')[0]}
                                        style={{ 
                                            width: "100%",
                                            padding: "10px",
                                            border: `1px solid ${validationErrors.endDate ? "var(--error, #ef4444)" : "var(--border, rgba(255, 255, 255, 0.1))"}`,
                                            borderRadius: "8px",
                                            background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                            color: "var(--text, #ffffff)"
                                        }}
                                    />
                                    {validationErrors.endDate && (
                                        <span style={{ color: "var(--error, #ef4444)", fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                                            {validationErrors.endDate}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: 4, color: "var(--text, #ffffff)", fontWeight: "500" }}>
                                        Guests <span style={{ color: "var(--error, #ef4444)" }}>*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        min={1} 
                                        max={20}
                                        value={numGuests} 
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value) || "";
                                            setNumGuests(value);
                                            const { numGuests: _, ...rest } = validationErrors;
                                            setValidationErrors(rest);
                                        }}
                                        style={{ 
                                            width: "100%",
                                            padding: "10px",
                                            border: `1px solid ${validationErrors.numGuests ? "var(--error, #ef4444)" : "var(--border, rgba(255, 255, 255, 0.1))"}`,
                                            borderRadius: "8px",
                                            background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                            color: "var(--text, #ffffff)"
                                        }}
                                    />
                                    {validationErrors.numGuests && (
                                        <span style={{ color: "var(--error, #ef4444)", fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                                            {validationErrors.numGuests}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: 4, color: "var(--text, #ffffff)", fontWeight: "500" }}>
                                        Coupon Code (Optional)
                                    </label>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        <input
                                            type="text"
                                            placeholder="Enter code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            style={{ 
                                                flex: 1,
                                                padding: "10px",
                                                border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                                                borderRadius: "8px",
                                                background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                                color: "var(--text, #ffffff)"
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!couponCode) return;
                                                try {
                                                    const start = new Date(startDate);
                                                    const end = new Date(endDate);
                                                    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                    const basePrice = (listing.price || 0) * nights * (Number(numGuests) || 1);
                                                    const discount = await applyCoupon(couponCode, basePrice);
                                                    setCouponDiscount(discount);
                                                    const { price: _, balance: __, ...rest } = validationErrors;
                                                    setValidationErrors(rest);
                                                    alert(`Coupon applied! Discount: ₱${discount.toFixed(2)}`);
                                                } catch (e) {
                                                    alert(e.message || "Invalid coupon");
                                                    setCouponDiscount(0);
                                                }
                                            }}
                                            disabled={!startDate || !endDate}
                                            style={{
                                                padding: "10px 16px",
                                                background: "var(--primary-gradient)",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                fontWeight: "500"
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Price breakdown */}
                            {startDate && endDate && listing.price && (
                                <div style={{ 
                                    border: "1px solid var(--border, rgba(255, 255, 255, 0.1))", 
                                    padding: "12px", 
                                    borderRadius: "var(--radius-md, 8px)", 
                                    background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                    color: "var(--text, #ffffff)",
                                    marginBottom: "16px"
                                }}>
                                    <h4 style={{ margin: "0 0 12px 0", color: "var(--text, #ffffff)", fontSize: "1.1rem", fontWeight: "600" }}>
                                        Price Breakdown
                                    </h4>
                                    {(() => {
                                        const start = new Date(startDate);
                                        const end = new Date(endDate);
                                        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                        const basePrice = (listing.price || 0) * nights * (Number(numGuests) || 1);
                                        const listingDiscount = listing.discountPercentage ? (basePrice * listing.discountPercentage) / 100 : 0;
                                        const priceAfterListingDiscount = basePrice - listingDiscount;
                                        const totalPrice = priceAfterListingDiscount + serviceFee;
                                        const finalPrice = totalPrice - couponDiscount;
                                        return (
                                            <>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>
                                                    <span>₱{listing.price?.toLocaleString()} × {nights} nights × {numGuests} guests</span>
                                                    <span>₱{basePrice.toLocaleString()}</span>
                                                </div>
                                                {listingDiscount > 0 && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success, #10b981)", marginTop: "4px" }}>
                                                        <span>Listing discount ({listing.discountPercentage}%)</span>
                                                        <span>-₱{listingDiscount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {serviceFee > 0 && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "4px" }}>
                                                        <span>Service fee</span>
                                                        <span>+₱{serviceFee.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {couponDiscount > 0 && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success, #10b981)", marginTop: "4px" }}>
                                                        <span>Coupon discount</span>
                                                        <span>-₱{couponDiscount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div style={{ 
                                                    display: "flex", 
                                                    justifyContent: "space-between", 
                                                    fontWeight: "bold", 
                                                    marginTop: "8px", 
                                                    paddingTop: "8px", 
                                                    borderTop: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                                                    color: "var(--text, #ffffff)",
                                                    fontSize: "1.1rem"
                                                }}>
                                                    <span>Total</span>
                                                    <span style={{ color: "var(--primary, #ff6b35)" }}>₱{finalPrice.toFixed(2)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Payment Method Selection */}
                            {startDate && endDate && listing.price && (
                                <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--border, rgba(255, 255, 255, 0.1))", borderRadius: 8 }}>
                                    <h4 style={{ marginBottom: 12, color: "var(--text, #ffffff)" }}>Payment Method</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text, #ffffff)" }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="wallet"
                                                checked={paymentMethod === "wallet"}
                                                onChange={(e) => {
                                                    setPaymentMethod(e.target.value);
                                                    const { balance: _, ...rest } = validationErrors;
                                                    setValidationErrors(rest);
                                                }}
                                            />
                                            <span>E-Wallet (Balance: ₱{balance.toLocaleString()})</span>
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text, #ffffff)" }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="paypal"
                                                checked={paymentMethod === "paypal"}
                                                onChange={(e) => {
                                                    setPaymentMethod(e.target.value);
                                                    const { balance: _, ...rest } = validationErrors;
                                                    setValidationErrors(rest);
                                                }}
                                            />
                                            <span>PayPal</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Validation errors */}
                            {showValidationErrors && Object.keys(validationErrors).length > 0 && (
                                <div style={{ 
                                    padding: "12px", 
                                    borderRadius: "var(--radius-md, 8px)", 
                                    background: "rgba(239, 68, 68, 0.2)", 
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    marginBottom: "16px"
                                }}>
                                    <strong style={{ color: "var(--error, #ef4444)", display: "block", marginBottom: "8px", fontWeight: "600" }}>
                                        Please fix the following errors:
                                    </strong>
                                    <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--error, #ef4444)" }}>
                                        {Object.values(validationErrors).map((error, index) => (
                                            <li key={index} style={{ marginBottom: "4px" }}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {checkingAvailability && (
                                <div style={{ 
                                    color: "var(--text-secondary, rgba(255, 255, 255, 0.6))",
                                    padding: "8px",
                                    borderRadius: "var(--radius-sm, 4px)",
                                    background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                    border: "1px solid var(--border-light, rgba(255, 255, 255, 0.06))",
                                    marginBottom: "16px",
                                    fontSize: "0.875rem"
                                }}>
                                    Checking availability...
                                </div>
                            )}

                            {availabilityMsg && !checkingAvailability && (
                                <div style={{ 
                                    color: availabilityMsg.startsWith("Available") || availabilityMsg.includes("successfully") || availabilityMsg.includes("confirmed") 
                                        ? "var(--success, #10b981)" 
                                        : "var(--error, #ef4444)",
                                    padding: "8px",
                                    borderRadius: "var(--radius-sm, 4px)",
                                    background: availabilityMsg.startsWith("Available") || availabilityMsg.includes("successfully") || availabilityMsg.includes("confirmed")
                                        ? "rgba(16, 185, 129, 0.2)"
                                        : "rgba(239, 68, 68, 0.2)",
                                    border: `1px solid ${availabilityMsg.startsWith("Available") || availabilityMsg.includes("successfully") || availabilityMsg.includes("confirmed")
                                        ? "rgba(16, 185, 129, 0.3)"
                                        : "rgba(239, 68, 68, 0.3)"}`,
                                    marginBottom: "16px",
                                    fontSize: "0.875rem",
                                    fontWeight: "500"
                                }}>
                                    {availabilityMsg}
                                </div>
                            )}

                            {/* PayPal Payment Component */}
                            {paymentMethod === "paypal" && startDate && endDate && listing.price && bookingCreated && (
                                <div style={{ marginBottom: 16 }}>
                                    <PayPalPayment
                                        amount={bookingCreated.totalPrice || calculateTotalPrice()}
                                        bookingId={bookingCreated.id}
                                        couponCode={couponCode || null}
                                        onSuccess={async (result) => {
                                            if (bookingCreated) {
                                                await awardBookingPoints(bookingCreated, bookingCreated.totalPrice);
                                            }
                                            setAvailabilityMsg(`Payment successful! Booking is pending host confirmation. (Order ID: ${result.orderId})`);
                                            setCouponCode("");
                                            setCouponDiscount(0);
                                            setBookingCreated(null);
                                        }}
                                        onError={(error) => {
                                            setAvailabilityMsg(`PayPal payment failed: ${error.message || "Please try again"}`);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Book Button */}
                            {paymentMethod === "wallet" ? (
                                <button
                                    className="book-btn"
                                    disabled={!startDate || !endDate || !numGuests || numGuests < 1 || creating || walletLoading}
                                    onClick={async () => {
                                        if (!currentUser) { 
                                            alert("Please log in to book."); 
                                            return; 
                                        }
                                        
                                        if (!validateBookingForm()) {
                                            setShowValidationErrors(true);
                                            setAvailabilityMsg("Please fix the validation errors before booking.");
                                            return;
                                        }
                                        setShowValidationErrors(false);

                                        setAvailabilityMsg("");
                                        
                                        try {
                                            const res = await checkAvailability(listing.id, startDate, endDate);
                                            if (!res.available) { 
                                                setAvailabilityMsg(res.reason || "Not available"); 
                                                return; 
                                            }

                                            const finalPrice = calculateTotalPrice();
                                            
                                            if (balance < finalPrice) {
                                                setAvailabilityMsg(`Insufficient balance. Required: ₱${finalPrice.toFixed(2)}, Available: ₱${balance.toFixed(2)}`);
                                                return;
                                            }

                                            const booking = await createBooking({
                                                listing: listing,
                                                guestUser: currentUser,
                                                startDate,
                                                endDate,
                                                guests: numGuests,
                                                couponCode: couponCode || null,
                                            });

                                            try {
                                                await pay(booking.totalPrice, booking.id, couponCode || null, booking.hostId || null);
                                                await awardBookingPoints(booking, booking.totalPrice);
                                                setAvailabilityMsg(`Payment successful! Booking is pending host confirmation. Amount: ₱${booking.totalPrice.toFixed(2)}`);
                                                setCouponCode("");
                                                setCouponDiscount(0);
                                                setValidationErrors({});
                                            } catch (payError) {
                                                setAvailabilityMsg(`Booking created but payment failed: ${payError.message}`);
                                            }
                                        } catch (err) {
                                            setAvailabilityMsg(err?.message || "Booking failed");
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "14px",
                                        background: "var(--primary-gradient)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        marginTop: "16px"
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
                                        
                                        if (!validateBookingForm()) {
                                            setShowValidationErrors(true);
                                            setAvailabilityMsg("Please fix the validation errors before booking.");
                                            return;
                                        }
                                        setShowValidationErrors(false);

                                        setAvailabilityMsg("");
                                        
                                        try {
                                            const res = await checkAvailability(listing.id, startDate, endDate);
                                            if (!res.available) { 
                                                setAvailabilityMsg(res.reason || "Not available"); 
                                                return; 
                                            }

                                            const booking = await createBooking({
                                                listing: listing,
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
                                    style={{
                                        width: "100%",
                                        padding: "14px",
                                        background: "var(--primary-gradient)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        marginTop: "16px"
                                    }}
                                >
                                    {creating ? "Creating Booking..." : "Create Booking & Pay with PayPal"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showReviewForm && (
                <ReviewForm
                    listingId={listing.id}
                    onClose={() => setShowReviewForm(false)}
                    onSuccess={() => {
                        setShowReviewForm(false);
                        window.location.reload();
                    }}
                />
            )}
        </>
    );
}
