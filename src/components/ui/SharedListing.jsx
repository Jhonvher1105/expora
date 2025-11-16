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
    const [suggestedListings, setSuggestedListings] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const { checkAvailability, createBooking, creating, calculateServiceFee } = useBooking();
    const { balance, pay, applyCoupon, loading: walletLoading } = useWallet();
    const { openChat } = useChat();
    // const { show}

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

    // Fetch suggested listings based on category
    useEffect(() => {
        if (!listing?.id || !listing?.category) {
            setSuggestedListings([]);
            return;
        }

        const fetchSuggestedListings = async () => {
            try {
                setLoadingSuggestions(true);
                const category = listing.category;
                
                // Fetch all listings from the same category, then filter in memory
                // This avoids Firestore index requirements and handles missing status fields
                const querySnapshot = await getDocs(collection(db, category));
                
                const allListings = querySnapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        category: category,
                        ...doc.data()
                    }))
                    .filter((item) => {
                        // Exclude current listing and only include published (or listings without status field for backward compatibility)
                        return item.id !== listing.id && (item.status === "published" || !item.status);
                    });
                
                // Shuffle and take up to 6 suggestions
                const shuffled = allListings.sort(() => 0.5 - Math.random());
                const suggestions = shuffled.slice(0, 6);
                
                setSuggestedListings(suggestions);
            } catch (error) {
                console.error("Error fetching suggested listings:", error);
                setSuggestedListings([]);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        fetchSuggestedListings();
    }, [listing?.id, listing?.category]);

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
            <style>{`
                .shared-listing-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .shared-listing-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 24px;
                    margin-bottom: 40px;
                }
                
                .booking-sidebar {
                    position: relative;
                    height: fit-content;
                    background: var(--bg-surface, rgba(255, 255, 255, 0.05));
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                    width: 100%;
                }
                
                .listing-image-container {
                    width: 100%;
                    overflow: hidden;
                    border-radius: 12px;
                }
                
                .listing-image-container img {
                    width: 100%;
                    height: auto;
                    min-height: 200px;
                    max-height: 500px;
                    object-fit: cover;
                    border-radius: 12px;
                }
                
                .icon-btn {
                    min-width: 40px;
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @media (min-width: 768px) {
                    .shared-listing-container {
                        padding: 30px 20px;
                    }
                    .shared-listing-grid {
                        grid-template-columns: 1fr 400px;
                    }
                    .booking-sidebar {
                        position: sticky;
                        top: 20px;
                    }
                    .listing-image-container img {
                        max-height: 600px;
                    }
                }
                
                @media (min-width: 1024px) {
                    .shared-listing-container {
                        padding: 40px 20px;
                    }
                    .shared-listing-grid {
                        grid-template-columns: 1fr 450px;
                    }
                }
                
                @media (max-width: 767px) {
                    .shared-listing-container {
                        padding: 16px 12px;
                    }
                    .shared-listing-grid {
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .booking-sidebar {
                        padding: 16px;
                        order: -1;
                    }
                    .listing-header {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 12px;
                    }
                    .listing-header h1 {
                        font-size: clamp(20px, 6vw, 28px) !important;
                        line-height: 1.2;
                    }
                    .listing-header-actions {
                        width: 100%;
                        justify-content: flex-start;
                        flex-wrap: wrap;
                    }
                    .amenities-grid {
                        grid-template-columns: 1fr !important;
                        gap: 6px !important;
                    }
                    .property-details {
                        flex-direction: column;
                        gap: 12px !important;
                    }
                    .price-display {
                        font-size: 20px !important;
                    }
                    .booking-input {
                        font-size: 16px !important;
                        padding: 12px !important;
                    }
                    .book-btn {
                        font-size: 14px !important;
                        padding: 14px !important;
                        min-height: 48px;
                    }
                    .price-breakdown {
                        font-size: 0.9rem;
                    }
                    .listing-image-container img {
                        min-height: 250px;
                        max-height: 400px;
                    }
                    .icon-btn {
                        min-width: 44px;
                        min-height: 44px;
                    }
                }
                
                @media (max-width: 480px) {
                    .shared-listing-container {
                        padding: 12px 8px;
                    }
                    .shared-listing-grid {
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .booking-sidebar {
                        padding: 12px;
                    }
                    .listing-header h1 {
                        font-size: clamp(18px, 7vw, 24px) !important;
                    }
                    .listing-header-actions {
                        gap: 6px;
                    }
                    .icon-btn {
                        min-width: 40px;
                        min-height: 40px;
                        padding: 6px !important;
                    }
                    .listing-image-container img {
                        min-height: 200px;
                        max-height: 300px;
                    }
                    .price-display {
                        font-size: 18px !important;
                    }
                    .booking-input {
                        font-size: 16px !important;
                        padding: 12px !important;
                    }
                    .book-btn {
                        font-size: 14px !important;
                        padding: 14px 12px !important;
                    }
                    .price-breakdown {
                        font-size: 0.85rem;
                        padding: 10px !important;
                    }
                    .property-details {
                        font-size: 0.9rem;
                    }
                }
                
                @media (max-width: 360px) {
                    .shared-listing-container {
                        padding: 10px 6px;
                    }
                    .booking-sidebar {
                        padding: 10px;
                    }
                    .listing-header h1 {
                        font-size: clamp(16px, 8vw, 20px) !important;
                    }
                }
                
                /* Touch-friendly improvements */
                @media (hover: none) and (pointer: coarse) {
                    .book-btn,
                    .icon-btn,
                    button {
                        min-height: 44px;
                    }
                    input[type="date"],
                    input[type="number"],
                    input[type="text"] {
                        min-height: 44px;
                        font-size: 16px;
                    }
                }
                
                /* Suggested listings responsive styles */
                @media (max-width: 767px) {
                    .destinations-grid {
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
                        gap: 16px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .destinations-grid {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                }
            `}</style>
            {!propListing && <Header />}
            <div className="homepage">
                <div className="shared-listing-container">
                    {/* Image Gallery */}
                    {images.length > 0 && (
                        <div className="listing-image-container" style={{ marginBottom: "24px" }}>
                            <img
                                src={images[0]}
                                alt={listing.title}
                            />
                        </div>
                    )}

                    <div className="shared-listing-grid">
                        {/* Main Content */}
                        <div>
                            <div className="listing-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                                <h1 style={{ fontSize: "clamp(20px, 5vw, 32px)", fontWeight: "bold", color: "var(--text, #ffffff)", margin: 0, flex: "1 1 auto", minWidth: "200px" }}>
                                    {listing.title}
                                </h1>
                                <div className="listing-header-actions" style={{ display: "flex", gap: "8px", position: "relative", flexShrink: 0 }}>
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

                            <p style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "clamp(14px, 3vw, 16px)", flexWrap: "wrap" }}>
                                <MapPin size={16} style={{ flexShrink: 0 }} /> <span>{locationStr}</span>
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
                                    padding: "clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 12px)", 
                                    borderRadius: "var(--radius-sm, 4px)", 
                                    marginTop: "8px", 
                                    marginBottom: "16px",
                                    display: "inline-block",
                                    fontWeight: "600",
                                    fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                                    boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)"
                                }}>
                                    {listing.discountPercentage}% OFF
                                    {listing.promoCode && ` - Use code: ${listing.promoCode}`}
                                </div>
                            )}

                            <p style={{ color: "var(--text, #ffffff)", lineHeight: "1.6", marginBottom: "16px", fontSize: "clamp(14px, 3vw, 16px)" }}>
                                {listing.description}
                            </p>

                            {/* Amenities */}
                            {amenities.length > 0 && (
                                <div style={{ marginBottom: "clamp(16px, 4vw, 24px)" }}>
                                    <h3 style={{ fontSize: "clamp(18px, 4vw, 20px)", fontWeight: "600", marginBottom: "12px", color: "var(--text, #ffffff)" }}>
                                        Amenities
                                    </h3>
                                    <ul className="amenities-grid" style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                                        {amenities.map((item, i) => (
                                            <li key={i} style={{ color: "var(--text, #ffffff)", fontSize: "clamp(14px, 3vw, 16px)", lineHeight: "1.5" }}>• {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Property Details */}
                            <div className="property-details" style={{ display: "flex", gap: "clamp(12px, 3vw, 24px)", marginBottom: "clamp(16px, 4vw, 24px)", flexWrap: "wrap" }}>
                                {listing.maxGuests && (
                                    <div style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Max Guests:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.maxGuests}</span>
                                    </div>
                                )}
                                {listing.bedrooms && (
                                    <div style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Bedrooms:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.bedrooms}</span>
                                    </div>
                                )}
                                {listing.bathrooms && (
                                    <div style={{ fontSize: "clamp(14px, 3vw, 16px)" }}>
                                        <strong style={{ color: "var(--text, #ffffff)" }}>Bathrooms:</strong>{" "}
                                        <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))" }}>{listing.bathrooms}</span>
                                    </div>
                                )}
                            </div>

                            {/* Availability Calendar */}
                            {listing?.id && (
                                <div style={{ marginTop: "clamp(16px, 4vw, 24px)", marginBottom: "clamp(16px, 4vw, 24px)" }}>
                                    <h3 style={{ marginBottom: 12, fontSize: "clamp(16px, 4vw, 1.1rem)", fontWeight: 600, color: "var(--text, #ffffff)" }}>
                                        Availability Calendar
                                    </h3>
                                    <AvailabilityCalendar 
                                        listingId={listing.id}
                                        initialStartDate={startDate}
                                        initialEndDate={endDate}
                                        onDateSelect={(dates) => {
                                            if (dates.start) {
                                                setStartDate(dates.start);
                                                const { startDate: _, ...rest } = validationErrors;
                                                setValidationErrors(rest);
                                            }
                                            if (dates.end) {
                                                setEndDate(dates.end);
                                                const { endDate: _, ...rest } = validationErrors;
                                                setValidationErrors(rest);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Reviews Section */}
                            <div style={{ marginTop: "clamp(24px, 5vw, 40px)", paddingTop: "clamp(16px, 4vw, 24px)", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: "12px" }}>
                                    <h3 style={{ margin: 0, color: "var(--text, #ffffff)", fontSize: "clamp(18px, 4vw, 20px)" }}>Reviews</h3>
                                    {currentUser && (
                                        <button
                                            onClick={() => setShowReviewForm(true)}
                                            style={{
                                                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                                                background: "#007bff",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "clamp(12px, 3vw, 14px)",
                                                minHeight: "44px"
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
                        <div className="booking-sidebar">
                            <div style={{ marginBottom: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <span className="price-display" style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: "bold", color: "var(--text, #ffffff)" }}>
                                        ₱{listing.price?.toLocaleString()}
                                    </span>
                                    <span style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", fontSize: "clamp(12px, 3vw, 14px)" }}>
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
                                        className="booking-input"
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
                                        className="booking-input"
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
                                        className="booking-input"
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
                                            className="booking-input"
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
                                                padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                                                background: "var(--primary-gradient)",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                                fontSize: "clamp(12px, 3vw, 14px)",
                                                minHeight: "44px",
                                                whiteSpace: "nowrap"
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Price breakdown */}
                            {startDate && endDate && listing.price && (
                                <div className="price-breakdown" style={{ 
                                    border: "1px solid var(--border, rgba(255, 255, 255, 0.1))", 
                                    padding: "12px", 
                                    borderRadius: "var(--radius-md, 8px)", 
                                    background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                                    color: "var(--text, #ffffff)",
                                    marginBottom: "16px"
                                }}>
                                    <h4 style={{ margin: "0 0 12px 0", color: "var(--text, #ffffff)", fontSize: "clamp(16px, 4vw, 1.1rem)", fontWeight: "600" }}>
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
                                <div style={{ marginBottom: 16, padding: "clamp(10px, 2vw, 12px)", border: "1px solid var(--border, rgba(255, 255, 255, 0.1))", borderRadius: 8 }}>
                                    <h4 style={{ marginBottom: 12, color: "var(--text, #ffffff)", fontSize: "clamp(14px, 3vw, 16px)" }}>Payment Method</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text, #ffffff)", fontSize: "clamp(14px, 3vw, 16px)", minHeight: "44px", padding: "4px 0" }}>
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
                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                            />
                                            <span>E-Wallet (Balance: ₱{balance.toLocaleString()})</span>
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text, #ffffff)", fontSize: "clamp(14px, 3vw, 16px)", minHeight: "44px", padding: "4px 0" }}>
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
                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
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

                    {/* Suggested Listings Section */}
                    {suggestedListings.length > 0 && (
                        <div style={{ marginTop: "60px", paddingTop: "40px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                            <h2 style={{ 
                                fontSize: "clamp(24px, 5vw, 32px)", 
                                fontWeight: "bold", 
                                color: "var(--text, #ffffff)", 
                                marginBottom: "24px" 
                            }}>
                                Suggested {listing.category === "properties" ? "Properties" : listing.category === "services" ? "Services" : "Experiences"}
                            </h2>
                            {loadingSuggestions ? (
                                <p style={{ color: "var(--text-muted, rgba(255, 255, 255, 0.7))", textAlign: "center", padding: "40px" }}>
                                    Loading suggestions...
                                </p>
                            ) : (
                                <div className="destinations-grid" style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                    gap: "24px",
                                    marginTop: "24px"
                                }}>
                                    {suggestedListings.map((suggested) => (
                                        <div 
                                            key={suggested.id} 
                                            className="destination-card"
                                            onClick={() => {
                                                const category = suggested.category || "properties";
                                                navigate(`/listing/${category}/${suggested.id}`);
                                            }}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="destination-image">
                                                {suggested.images && suggested.images.length > 0 ? (
                                                    <img
                                                        src={suggested.images[0]}
                                                        alt={suggested.title}
                                                        className="property-img"
                                                    />
                                                ) : (
                                                    <div className="no-image">No Image</div>
                                                )}
                                            </div>
                                            <div className="destination-content">
                                                <div className="destination-header">
                                                    <h3 className="destination-name">{suggested.title}</h3>
                                                    <span className="destination-price">
                                                        ₱{suggested.price?.toLocaleString()} {suggested.day_night || (suggested.category === "services" ? "/ Head" : "/ night")}
                                                    </span>
                                                </div>
                                                <p className="destination-location">
                                                    <MapPin size={14} /> {suggested.location?.address || suggested.location || "Location not specified"}
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
                                                            const category = suggested.category || "properties";
                                                            navigate(`/listing/${category}/${suggested.id}`);
                                                        }}
                                                    >
                                                        Explore
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
