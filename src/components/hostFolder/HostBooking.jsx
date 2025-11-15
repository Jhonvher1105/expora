import { useState, useEffect } from "react";
import { MapPin, Calendar, Users, DollarSign, X, CheckCircle, Clock, XCircle, User, Mail, Phone, Loader2 } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Hheader";
import Footer from "../generalFile/Footer";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function HostBooking() {
    const [currentUser, setCurrentUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("all"); // "all", "pending", "confirmed", "cancelled"
    const [guestInfo, setGuestInfo] = useState({}); // Store guest info by guestId
    const [loadingGuests, setLoadingGuests] = useState({}); // Track loading state for each guest
    const [selectedBooking, setSelectedBooking] = useState(null); // Selected booking for modal

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

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

    // Fetch host bookings
    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const q = query(
                    collection(db, "bookings"),
                    where("hostId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const bookingsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Sort by date (newest first)
                bookingsData.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                    return dateB - dateA;
                });

                setBookings(bookingsData);

                // Fetch guest info for all bookings
                bookingsData.forEach(booking => {
                    if (booking.guestId) {
                        fetchGuestInfo(booking.guestId);
                    }
                });
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    // Fetch guest info when modal opens
    useEffect(() => {
        if (selectedBooking && selectedBooking.guestId && !guestInfo[selectedBooking.guestId] && !loadingGuests[selectedBooking.guestId]) {
            fetchGuestInfo(selectedBooking.guestId);
        }
    }, [selectedBooking]);

    // Filter bookings based on selected tab
    const filteredBookings = bookings.filter((booking) => {
        if (selectedTab === "all") return true;
        return booking.status === selectedTab;
    });

    // Get status badge color and icon
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

    // Format date
    const formatDate = (date) => {
        if (!date) return "N/A";
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    // Confirm booking
    const handleConfirmBooking = async (bookingId) => {
        if (!window.confirm("Are you sure you want to confirm this booking?")) return;

        try {
            // Get booking data to get the amount
            const booking = bookings.find(b => b.id === bookingId);
            if (!booking) {
                alert("Booking not found");
                return;
            }

            const bookingRef = doc(db, "bookings", bookingId);
            
            // Update booking status
            await updateDoc(bookingRef, {
                status: "confirmed",
                updatedAt: serverTimestamp(),
                confirmedAt: serverTimestamp()
            });

            // Add host earnings only when booking is confirmed
            // Use hostEarnings from booking (already has service fee deducted)
            // If hostEarnings doesn't exist, fall back to totalPrice - serviceFee
            if (booking.paymentStatus === "paid") {
                try {
                    const hostEarningsAmount = booking.hostEarnings !== undefined 
                        ? Number(booking.hostEarnings) 
                        : (Number(booking.totalPrice || 0) - Number(booking.serviceFee || 0));
                    const serviceFeeAmount = Number(booking.serviceFee || 0);

                    if (hostEarningsAmount <= 0) {
                        console.warn("Invalid host earnings amount:", hostEarningsAmount);
                        return;
                    }

                    // Get host wallet
                    const hostWalletRef = doc(db, "wallets", currentUser.uid);
                    const hostWalletSnap = await getDoc(hostWalletRef);
                    
                    let currentEarnings = 0;
                    if (hostWalletSnap.exists()) {
                        currentEarnings = hostWalletSnap.data().earnings || 0;
                    }

                    const newEarnings = currentEarnings + hostEarningsAmount;
                    await updateDoc(hostWalletRef, {
                        earnings: newEarnings,
                        currency: "PHP",
                        updatedAt: serverTimestamp(),
                    });

                    // Record host earnings transaction (net amount after service fee)
                    await addDoc(collection(db, "transactions"), {
                        hostId: currentUser.uid,
                        type: "earnings",
                        amount: hostEarningsAmount,
                        serviceFee: serviceFeeAmount,
                        grossAmount: hostEarningsAmount + serviceFeeAmount, // Total before service fee
                        bookingId,
                        currency: "PHP",
                        status: "completed",
                        createdAt: serverTimestamp(),
                    });

                    // Record service fee transaction (platform revenue)
                    if (serviceFeeAmount > 0) {
                        await addDoc(collection(db, "transactions"), {
                            type: "service_fee",
                            amount: serviceFeeAmount,
                            bookingId,
                            hostId: currentUser.uid,
                            currency: "PHP",
                            status: "completed",
                            createdAt: serverTimestamp(),
                        });
                    }
                } catch (earningsError) {
                    console.error("Error adding host earnings:", earningsError);
                    // Don't fail the confirmation if earnings fail
                }
            }

            // Update local state
            setBookings(bookings.map(b => 
                b.id === bookingId ? { ...b, status: "confirmed", confirmedAt: new Date() } : b
            ));
            alert("Booking confirmed successfully! Earnings have been added to your wallet.");
        } catch (error) {
            console.error("Error confirming booking:", error);
            alert("Failed to confirm booking. Please try again.");
        }
    };

    // Reject/Cancel booking
    const handleRejectBooking = async (bookingId) => {
        if (!window.confirm("Are you sure you want to reject this booking? If payment was made, a refund may be required.")) return;

        try {
            const bookingRef = doc(db, "bookings", bookingId);
            await updateDoc(bookingRef, {
                status: "cancelled",
                updatedAt: serverTimestamp(),
                cancelledAt: serverTimestamp()
            });

            // Update local state
            setBookings(bookings.map(b => 
                b.id === bookingId ? { ...b, status: "cancelled", cancelledAt: new Date() } : b
            ));
            alert("Booking rejected successfully. Note: If payment was made, refund processing may be required.");
        } catch (error) {
            console.error("Error rejecting booking:", error);
            alert("Failed to reject booking. Please try again.");
        }
    };

    if (!currentUser) {
        return (
            <>
                <Header />
                <div className="profile-container" style={{ paddingTop: "120px", textAlign: "center" }}>
                    <h2>Please log in to view your bookings</h2>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="profile-container" style={{ paddingTop: "120px" }}>
                <div className="host-booking-container">
                    <h1 className="host-booking-title">Host Bookings</h1>

                    {/* Tabs */}
                    <div className="host-booking-tabs">
                        <button
                            className={`host-booking-tab ${selectedTab === "all" ? "host-booking-tab-active" : ""}`}
                            onClick={() => setSelectedTab("all")}
                        >
                            All ({bookings.length})
                        </button>
                        <button
                            className={`host-booking-tab ${selectedTab === "pending" ? "host-booking-tab-active" : ""}`}
                            onClick={() => setSelectedTab("pending")}
                        >
                            Pending ({bookings.filter(b => b.status === "pending").length})
                        </button>
                        <button
                            className={`host-booking-tab ${selectedTab === "confirmed" ? "host-booking-tab-active" : ""}`}
                            onClick={() => setSelectedTab("confirmed")}
                        >
                            Confirmed ({bookings.filter(b => b.status === "confirmed").length})
                        </button>
                        <button
                            className={`host-booking-tab ${selectedTab === "cancelled" ? "host-booking-tab-active" : ""}`}
                            onClick={() => setSelectedTab("cancelled")}
                        >
                            Cancelled ({bookings.filter(b => b.status === "cancelled").length})
                        </button>
                    </div>

                    {/* Bookings List */}
                    {loading ? (
                        <div className="host-booking-loading">
                            <p>Loading bookings...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="host-booking-empty-state">
                            <Calendar size={48} />
                            <h3>No bookings found</h3>
                            <p>
                                {selectedTab === "all" 
                                    ? "You don't have any bookings yet."
                                    : `You don't have any ${selectedTab} bookings.`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="host-booking-list">
                            {filteredBookings.map((booking) => {
                                const statusBadge = getStatusBadge(booking.status);
                                const guest = guestInfo[booking.guestId];
                                const isLoadingGuest = loadingGuests[booking.guestId];
                                const guestName = guest 
                                    ? `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || guest.email 
                                    : (isLoadingGuest ? "Loading..." : "Guest Information Not Available");
                                
                                return (
                                    <div
                                        key={booking.id}
                                        className="host-booking-card"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setSelectedBooking(booking)}
                                    >
                                        <div className="host-booking-header">
                                            <div className="host-booking-info">
                                                <h3 className="host-booking-title-text">
                                                    {booking.listingTitle || "Unknown Property"}
                                                </h3>
                                                
                                                {/* Guest Information */}
                                                <div className="host-booking-guest-info">
                                                    <div className="host-booking-guest-header">
                                                        <User size={16} />
                                                        <span>Guest Information</span>
                                                    </div>
                                                    <div className="host-booking-guest-details">
                                                        {isLoadingGuest ? (
                                                            <div className="host-booking-guest-item" style={{ gap: "0.5rem" }}>
                                                                <Loader2 size={14} className="spinning" />
                                                                <span>Loading guest information...</span>
                                                            </div>
                                                        ) : guest ? (
                                                            <>
                                                                <div className="host-booking-guest-item">
                                                                    <User size={14} />
                                                                    <span>{guestName}</span>
                                                                </div>
                                                                {guest.email && (
                                                                    <div className="host-booking-guest-item">
                                                                        <Mail size={14} />
                                                                        <span>{guest.email}</span>
                                                                    </div>
                                                                )}
                                                                {guest.phoneNumber && (
                                                                    <div className="host-booking-guest-item">
                                                                        <Phone size={14} />
                                                                        <span>{guest.phoneNumber}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="host-booking-guest-item">
                                                                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                                                    {guestName}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="host-booking-meta">
                                                    <div className="host-booking-meta-item">
                                                        <MapPin size={16} />
                                                        <span>{booking.listingType || "Property"}</span>
                                                    </div>
                                                    <div className="host-booking-meta-item">
                                                        <Calendar size={16} />
                                                        <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                                                    </div>
                                                    <div className="host-booking-meta-item">
                                                        <Users size={16} />
                                                        <span>{booking.guests || 1} guest{booking.guests > 1 ? "s" : ""}</span>
                                                    </div>
                                                    <div className="host-booking-meta-item">
                                                        <DollarSign size={16} />
                                                        <span>{booking.nights || 0} night{booking.nights > 1 ? "s" : ""}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="host-booking-actions">
                                                <div
                                                    className={`host-booking-status-badge host-booking-status-${booking.status}`}
                                                >
                                                    {statusBadge.icon}
                                                    {statusBadge.text}
                                                </div>
                                                <div>
                                                    <div className="host-booking-price">
                                                        ₱{booking.totalPrice?.toFixed(2) || "0.00"}
                                                    </div>
                                                    <div className="host-booking-price-label">Total Price</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Booking Details */}
                                        <div className="host-booking-details">
                                            <div className="host-booking-detail-item">
                                                <div className="host-booking-detail-label">Price per Night</div>
                                                <div className="host-booking-detail-value">
                                                    ₱{booking.pricePerNight?.toLocaleString() || "0"}
                                                </div>
                                            </div>
                                            {booking.discountAmount > 0 && (
                                                <div className="host-booking-detail-item">
                                                    <div className="host-booking-detail-label">Discount</div>
                                                    <div className="host-booking-detail-value host-booking-detail-value-success">
                                                        -₱{booking.discountAmount?.toFixed(2) || "0.00"}
                                                    </div>
                                                </div>
                                            )}
                                            {booking.couponCode && (
                                                <div className="host-booking-detail-item">
                                                    <div className="host-booking-detail-label">Coupon Code</div>
                                                    <div className="host-booking-detail-value">
                                                        {booking.couponCode}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="host-booking-detail-item">
                                                <div className="host-booking-detail-label">Booking Date</div>
                                                <div className="host-booking-detail-value">
                                                    {formatDate(booking.createdAt)}
                                                </div>
                                            </div>
                                            {booking.paymentStatus && (
                                                <div className="host-booking-detail-item">
                                                    <div className="host-booking-detail-label">Payment Status</div>
                                                    <div className={`host-booking-detail-value ${booking.paymentStatus === "paid" ? "host-booking-detail-value-success" : "host-booking-detail-value-warning"}`}>
                                                        {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        {booking.status === "pending" && (
                                            <div 
                                                className="host-booking-action-buttons" 
                                                style={{ marginTop: "1rem", justifyContent: "flex-end" }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    className="host-booking-btn host-booking-btn-reject"
                                                >
                                                    <X size={16} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleConfirmBooking(booking.id)}
                                                    className="host-booking-btn host-booking-btn-confirm"
                                                >
                                                    <CheckCircle size={16} />
                                                    Confirm Booking
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Detailed Booking Modal */}
            {selectedBooking && (
                <div 
                    className="modal-overlay" 
                    onClick={() => setSelectedBooking(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Booking details"
                >
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="modal-close" 
                            onClick={() => setSelectedBooking(null)}
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="modal-content">
                            <div style={{ marginBottom: "2rem" }}>
                                <h2 className="modal-title" style={{ marginBottom: "0.5rem" }}>
                                    {selectedBooking.listingTitle || "Unknown Property"}
                                </h2>
                                <div className={`host-booking-status-badge host-booking-status-${selectedBooking.status}`} style={{ display: "inline-flex" }}>
                                    {getStatusBadge(selectedBooking.status).icon}
                                    {getStatusBadge(selectedBooking.status).text}
                                </div>
                            </div>

                            {/* Guest Information Section */}
                            <div className="host-booking-guest-info" style={{ marginBottom: "2rem" }}>
                                <div className="host-booking-guest-header">
                                    <User size={18} />
                                    <span>Guest Information</span>
                                </div>
                                {loadingGuests[selectedBooking.guestId] ? (
                                    <div className="host-booking-guest-item" style={{ gap: "0.5rem", padding: "1rem 0" }}>
                                        <Loader2 size={16} className="spinning" />
                                        <span>Loading guest information...</span>
                                    </div>
                                ) : guestInfo[selectedBooking.guestId] ? (
                                    <div className="host-booking-guest-details">
                                        <div className="host-booking-guest-item">
                                            <User size={16} />
                                            <span>
                                                {`${guestInfo[selectedBooking.guestId].firstName || ""} ${guestInfo[selectedBooking.guestId].lastName || ""}`.trim() || 
                                                 guestInfo[selectedBooking.guestId].email || 
                                                 "Guest"}
                                            </span>
                                        </div>
                                        {guestInfo[selectedBooking.guestId].email && (
                                            <div className="host-booking-guest-item">
                                                <Mail size={16} />
                                                <span>{guestInfo[selectedBooking.guestId].email}</span>
                                            </div>
                                        )}
                                        {guestInfo[selectedBooking.guestId].phoneNumber && (
                                            <div className="host-booking-guest-item">
                                                <Phone size={16} />
                                                <span>{guestInfo[selectedBooking.guestId].phoneNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="host-booking-guest-item" style={{ padding: "1rem 0" }}>
                                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                            Guest Information Not Available
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Booking Details Section */}
                            <div style={{ marginBottom: "2rem" }}>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text)" }}>
                                    Booking Details
                                </h3>
                                <div className="host-booking-meta" style={{ marginBottom: "1.5rem" }}>
                                    <div className="host-booking-meta-item">
                                        <MapPin size={18} />
                                        <span>{selectedBooking.listingType || "Property"}</span>
                                    </div>
                                    <div className="host-booking-meta-item">
                                        <Calendar size={18} />
                                        <span>{formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)}</span>
                                    </div>
                                    <div className="host-booking-meta-item">
                                        <Users size={18} />
                                        <span>{selectedBooking.guests || 1} guest{selectedBooking.guests > 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="host-booking-meta-item">
                                        <DollarSign size={18} />
                                        <span>{selectedBooking.nights || 0} night{selectedBooking.nights > 1 ? "s" : ""}</span>
                                    </div>
                                </div>

                                <div className="host-booking-details">
                                    <div className="host-booking-detail-item">
                                        <div className="host-booking-detail-label">Price per Night</div>
                                        <div className="host-booking-detail-value">
                                            ₱{selectedBooking.pricePerNight?.toLocaleString() || "0"}
                                        </div>
                                    </div>
                                    <div className="host-booking-detail-item">
                                        <div className="host-booking-detail-label">Nights</div>
                                        <div className="host-booking-detail-value">
                                            {selectedBooking.nights || 0} night{selectedBooking.nights > 1 ? "s" : ""}
                                        </div>
                                    </div>
                                    {selectedBooking.discountAmount > 0 && (
                                        <div className="host-booking-detail-item">
                                            <div className="host-booking-detail-label">Discount</div>
                                            <div className="host-booking-detail-value host-booking-detail-value-success">
                                                -₱{selectedBooking.discountAmount?.toFixed(2) || "0.00"}
                                            </div>
                                        </div>
                                    )}
                                    {selectedBooking.serviceFee > 0 && (
                                        <div className="host-booking-detail-item">
                                            <div className="host-booking-detail-label">Service Fee</div>
                                            <div className="host-booking-detail-value">
                                                ₱{selectedBooking.serviceFee?.toFixed(2) || "0.00"}
                                            </div>
                                        </div>
                                    )}
                                    {selectedBooking.couponCode && (
                                        <div className="host-booking-detail-item">
                                            <div className="host-booking-detail-label">Coupon Code</div>
                                            <div className="host-booking-detail-value">
                                                {selectedBooking.couponCode}
                                            </div>
                                        </div>
                                    )}
                                    <div className="host-booking-detail-item" style={{ borderTop: "2px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                                        <div className="host-booking-detail-label" style={{ fontWeight: 600, fontSize: "1.1rem" }}>Total Price</div>
                                        <div className="host-booking-detail-value" style={{ fontWeight: 600, fontSize: "1.25rem", color: "var(--primary)" }}>
                                            ₱{selectedBooking.totalPrice?.toFixed(2) || "0.00"}
                                        </div>
                                    </div>
                                    <div className="host-booking-detail-item">
                                        <div className="host-booking-detail-label">Booking Date</div>
                                        <div className="host-booking-detail-value">
                                            {formatDate(selectedBooking.createdAt)}
                                        </div>
                                    </div>
                                    {selectedBooking.paymentStatus && (
                                        <div className="host-booking-detail-item">
                                            <div className="host-booking-detail-label">Payment Status</div>
                                            <div className={`host-booking-detail-value ${selectedBooking.paymentStatus === "paid" ? "host-booking-detail-value-success" : "host-booking-detail-value-warning"}`}>
                                                {selectedBooking.paymentStatus === "paid" ? "Paid" : "Pending"}
                                            </div>
                                        </div>
                                    )}
                                    {selectedBooking.hostEarnings && (
                                        <div className="host-booking-detail-item">
                                            <div className="host-booking-detail-label">Your Earnings</div>
                                            <div className="host-booking-detail-value host-booking-detail-value-success">
                                                ₱{selectedBooking.hostEarnings?.toFixed(2) || "0.00"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {selectedBooking.status === "pending" && (
                                <div className="host-booking-action-buttons" style={{ marginTop: "2rem", gap: "1rem" }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRejectBooking(selectedBooking.id);
                                            setSelectedBooking(null);
                                        }}
                                        className="host-booking-btn host-booking-btn-reject"
                                        style={{ flex: 1 }}
                                    >
                                        <X size={18} />
                                        Reject Booking
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleConfirmBooking(selectedBooking.id);
                                            setSelectedBooking(null);
                                        }}
                                        className="host-booking-btn host-booking-btn-confirm"
                                        style={{ flex: 1 }}
                                    >
                                        <CheckCircle size={18} />
                                        Confirm Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}

export default HostBooking;


