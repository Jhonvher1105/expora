import { useState, useEffect } from "react";
import { MapPin, Calendar, Users, DollarSign, X, CheckCircle, Clock, XCircle } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";
import Footer from "../generalFile/Footer";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function MyBooking() {
    const [currentUser, setCurrentUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("all"); // "all", "pending", "confirmed", "cancelled"

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch user bookings
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
                    where("guestId", "==", currentUser.uid)
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

    // Cancel booking
    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;

        try {
            const bookingRef = doc(db, "bookings", bookingId);
            await updateDoc(bookingRef, {
                status: "cancelled",
                updatedAt: new Date()
            });

            // Update local state
            setBookings(bookings.map(b => 
                b.id === bookingId ? { ...b, status: "cancelled" } : b
            ));
            alert("Booking cancelled successfully");
        } catch (error) {
            console.error("Error cancelling booking:", error);
            alert("Failed to cancel booking. Please try again.");
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
                    <h1 style={{ marginBottom: "2rem", color: "var(--text)" }}>My Bookings</h1>

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
                                    ? "You haven't made any bookings yet."
                                    : `You don't have any ${selectedTab} bookings.`
                                }
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "1.5rem" }}>
                            {filteredBookings.map((booking) => {
                                const statusBadge = getStatusBadge(booking.status);
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
                                        </div>

                                        {/* Action Buttons */}
                                        {booking.status === "pending" && (
                                            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                                                <button
                                                    onClick={() => handleCancelBooking(booking.id)}
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
                                                        e.target.style.background = "#ef4444";
                                                        e.target.style.color = "white";
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.background = "transparent";
                                                        e.target.style.color = "#ef4444";
                                                    }}
                                                >
                                                    <X size={16} />
                                                    Cancel Booking
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

export default MyBooking;

