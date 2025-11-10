import { useState, useEffect } from "react";
import { MapPin, Calendar, Users, DollarSign, X, CheckCircle, Clock, XCircle, User, Mail, Phone } from "lucide-react";
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch guest information
    const fetchGuestInfo = async (guestId) => {
        if (!guestId || guestInfo[guestId]) return; // Already fetched
        
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
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
                    <h1 style={{ marginBottom: "2rem", color: "var(--text)" }}>Host Bookings</h1>

                    {/* Tabs */}
                    <div className="tabs" style={{ marginBottom: "2rem", borderBottom: "2px solid rgba(255, 255, 255, 0.1)" }}>
                        <button
                            className={`tab ${selectedTab === "all" ? "tab-active" : ""}`}
                            onClick={() => setSelectedTab("all")}
                        >
                            All ({bookings.length})
                        </button>
                        <button
                            className={`tab ${selectedTab === "pending" ? "tab-active" : ""}`}
                            onClick={() => setSelectedTab("pending")}
                        >
                            Pending ({bookings.filter(b => b.status === "pending").length})
                        </button>
                        <button
                            className={`tab ${selectedTab === "confirmed" ? "tab-active" : ""}`}
                            onClick={() => setSelectedTab("confirmed")}
                        >
                            Confirmed ({bookings.filter(b => b.status === "confirmed").length})
                        </button>
                        <button
                            className={`tab ${selectedTab === "cancelled" ? "tab-active" : ""}`}
                            onClick={() => setSelectedTab("cancelled")}
                        >
                            Cancelled ({bookings.filter(b => b.status === "cancelled").length})
                        </button>
                    </div>

                    {/* Bookings List */}
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text)" }}>
                            <p>Loading bookings...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div style={{ 
                            textAlign: "center", 
                            padding: "4rem", 
                            background: "rgba(255, 255, 255, 0.02)",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}>
                            <Calendar size={48} style={{ color: "rgba(255, 255, 255, 0.5)", marginBottom: "1rem" }} />
                            <h3 style={{ color: "var(--text)", marginBottom: "0.5rem" }}>No bookings found</h3>
                            <p style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                                {selectedTab === "all" 
                                    ? "You don't have any bookings yet."
                                    : `You don't have any ${selectedTab} bookings.`
                                }
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "1.5rem" }}>
                            {filteredBookings.map((booking) => {
                                const statusBadge = getStatusBadge(booking.status);
                                const guest = guestInfo[booking.guestId];
                                const guestName = guest ? `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || guest.email : "Guest";
                                
                                return (
                                    <div
                                        key={booking.id}
                                        style={{
                                            background: "rgba(255, 255, 255, 0.02)",
                                            borderRadius: "12px",
                                            padding: "1.5rem",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                            transition: "all 0.3s ease"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ color: "var(--text)", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                                                    {booking.listingTitle || "Unknown Property"}
                                                </h3>
                                                
                                                {/* Guest Information */}
                                                <div style={{ 
                                                    marginBottom: "1rem", 
                                                    padding: "1rem", 
                                                    background: "rgba(255, 255, 255, 0.03)",
                                                    borderRadius: "8px"
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--text)", fontWeight: "600" }}>
                                                        <User size={16} />
                                                        <span>Guest Information</span>
                                                    </div>
                                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.875rem" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                            <User size={14} />
                                                            <span>{guestName}</span>
                                                        </div>
                                                        {guest?.email && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                <Mail size={14} />
                                                                <span>{guest.email}</span>
                                                            </div>
                                                        )}
                                                        {guest?.phoneNumber && (
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                <Phone size={14} />
                                                                <span>{guest.phoneNumber}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                        <MapPin size={16} />
                                                        <span>{booking.listingType || "Property"}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                        <Calendar size={16} />
                                                        <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                        <Users size={16} />
                                                        <span>{booking.guests || 1} guest{booking.guests > 1 ? "s" : ""}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                        <DollarSign size={16} />
                                                        <span>{booking.nights || 0} night{booking.nights > 1 ? "s" : ""}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem",
                                                        padding: "0.5rem 1rem",
                                                        borderRadius: "20px",
                                                        background: statusBadge.bgColor,
                                                        color: statusBadge.color,
                                                        fontSize: "0.875rem",
                                                        fontWeight: "600"
                                                    }}
                                                >
                                                    {statusBadge.icon}
                                                    {statusBadge.text}
                                                </div>
                                                <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--primary)" }}>
                                                    ₱{booking.totalPrice?.toFixed(2) || "0.00"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Booking Details */}
                                        <div style={{ 
                                            display: "grid", 
                                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                                            gap: "1rem",
                                            padding: "1rem",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            borderRadius: "8px",
                                            marginTop: "1rem"
                                        }}>
                                            <div>
                                                <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.25rem" }}>
                                                    Price per Night
                                                </div>
                                                <div style={{ color: "var(--text)", fontWeight: "600" }}>
                                                    ₱{booking.pricePerNight?.toLocaleString() || "0"}
                                                </div>
                                            </div>
                                            {booking.discountAmount > 0 && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.25rem" }}>
                                                        Discount
                                                    </div>
                                                    <div style={{ color: "#10b981", fontWeight: "600" }}>
                                                        -₱{booking.discountAmount?.toFixed(2) || "0.00"}
                                                    </div>
                                                </div>
                                            )}
                                            {booking.couponCode && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.25rem" }}>
                                                        Coupon Code
                                                    </div>
                                                    <div style={{ color: "var(--text)", fontWeight: "600" }}>
                                                        {booking.couponCode}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.25rem" }}>
                                                    Booking Date
                                                </div>
                                                <div style={{ color: "var(--text)", fontWeight: "600" }}>
                                                    {formatDate(booking.createdAt)}
                                                </div>
                                            </div>
                                            {booking.paymentStatus && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.25rem" }}>
                                                        Payment Status
                                                    </div>
                                                    <div style={{ 
                                                        color: booking.paymentStatus === "paid" ? "#10b981" : "#f59e0b", 
                                                        fontWeight: "600" 
                                                    }}>
                                                        {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        {booking.status === "pending" && (
                                            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                                                <button
                                                    onClick={() => handleRejectBooking(booking.id)}
                                                    style={{
                                                        padding: "0.5rem 1.5rem",
                                                        background: "transparent",
                                                        color: "#ef4444",
                                                        border: "1px solid #ef4444",
                                                        borderRadius: "8px",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        fontSize: "0.875rem",
                                                        transition: "all 0.2s ease",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem"
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.target.style.background = "var(--error, #ef4444)";
                                                        e.target.style.color = "var(--text, #ffffff)";
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.background = "transparent";
                                                        e.target.style.color = "var(--error, #ef4444)";
                                                    }}
                                                >
                                                    <X size={16} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleConfirmBooking(booking.id)}
                                                    style={{
                                                        padding: "0.5rem 1.5rem",
                                                        background: "var(--primary)",
                                                        color: "var(--text, #ffffff)",
                                                        border: "none",
                                                        borderRadius: "8px",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        fontSize: "0.875rem",
                                                        transition: "all 0.2s ease",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem"
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.target.style.opacity = "0.9";
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.opacity = "1";
                                                    }}
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
            <Footer />
        </>
    );
}

export default HostBooking;


