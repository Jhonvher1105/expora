import { useState, useEffect } from "react";
import { Clock, ArrowUp, ArrowDown, Gift, Calendar, Filter, Copy, CheckCircle } from "lucide-react";
import { usePoints } from "../../context/PointsContext";
import Header from "../UserFolder/Header";
import HostHeader from "../hostFolder/Hheader";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function PointsHistory() {
    const { getPointsHistory, loading } = usePoints();
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [filter, setFilter] = useState("all"); // "all", "earned", "redeemed"
    const [currentUser, setCurrentUser] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [copiedCouponCode, setCopiedCouponCode] = useState(null);

    // Check if user is host
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    // Check if user has any properties (is a host)
                    const propertiesQuery = query(
                        collection(db, "properties"),
                        where("ownerId", "==", user.uid)
                    );
                    const propertiesSnap = await getDocs(propertiesQuery);
                    setIsHost(!propertiesSnap.empty);
                } catch (error) {
                    console.error("Error checking host status:", error);
                    setIsHost(false);
                }
            } else {
                setIsHost(false);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const data = await getPointsHistory(200);
            setHistory(data);
        } catch (error) {
            console.error("Error loading points history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const copyCouponCode = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCouponCode(code);
            setTimeout(() => setCopiedCouponCode(null), 2000);
        } catch (error) {
            alert("Failed to copy coupon code: " + code);
        }
    };

    // Filter history based on selected filter
    const filteredHistory = history.filter((transaction) => {
        if (filter === "earned") return transaction.amount > 0;
        if (filter === "redeemed") return transaction.amount < 0;
        return true; // "all"
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case "booking":
            case "first_booking":
            case "host_booking":
            case "host_first_booking":
            case "host_bonus":
            case "bonus":
                return <ArrowUp size={20} color="#ff6b35" />;
            case "referral":
                return <Gift size={20} color="#ff6b35" />;
            case "redemption":
                return <ArrowDown size={20} color="#ff4757" />;
            default:
                return <Clock size={20} color="#888888" />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case "booking":
                return "Booking Points";
            case "first_booking":
                return "First Booking Bonus";
            case "host_booking":
                return "Host Booking Points";
            case "host_first_booking":
                return "First Confirmation Bonus";
            case "host_bonus":
                return "Repeat Confirmation Bonus";
            case "referral":
                return "Referral Bonus";
            case "bonus":
                return "Bonus Points";
            case "redemption":
                return "Points Redeemed";
            default:
                return type;
        }
    };

    // Calculate statistics
    const stats = {
        totalEarned: history.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        totalRedeemed: Math.abs(history.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
        totalTransactions: history.length,
        earnedCount: history.filter(t => t.amount > 0).length,
        redeemedCount: history.filter(t => t.amount < 0).length
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Unknown";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <>
            {isHost ? <HostHeader /> : <Header />}
            <div className="points-history-page" style={{ 
                padding: "2rem", 
                maxWidth: "1200px", 
                margin: "0 auto", 
                color: "#e0e0e0",
                background: "#0a0a0a",
                minHeight: "100vh"
            }}>
                <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                        <div style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            background: "var(--primary-gradient)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <Gift size={30} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "2.5rem", margin: 0, background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", paddingTop: "10rem" }}>
                                "Points & Rewards History
                            </h1>
                            <p style={{ fontSize: "1rem", color: "#a0a0a0", margin: 0 }}>
                                Track all your points transactions and rewards
                            </p>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                {history.length > 0 && (
                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                        gap: "1rem", 
                        marginBottom: "2rem" 
                    }}>
                        <div style={{
                            background: "#151515",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            textAlign: "center",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                        }}>
                            <div style={{ fontSize: "0.9rem", color: "#888888", marginBottom: "0.5rem" }}>
                                Total Points Earned
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ff6b35" }}>
                                +{stats.totalEarned.toLocaleString()}
                            </div>
                        </div>
                        <div style={{
                            background: "#151515",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            textAlign: "center",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                        }}>
                            <div style={{ fontSize: "0.9rem", color: "#888888", marginBottom: "0.5rem" }}>
                                Total Points Redeemed
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ff4757" }}>
                                -{stats.totalRedeemed.toLocaleString()}
                            </div>
                        </div>
                        <div style={{
                            background: "#151515",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            textAlign: "center",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                        }}>
                            <div style={{ fontSize: "0.9rem", color: "#888888", marginBottom: "0.5rem" }}>
                                Total Transactions
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#e0e0e0" }}>
                                {stats.totalTransactions}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div style={{ 
                    display: "flex", 
                    gap: "0.5rem", 
                    marginBottom: "1.5rem",
                    flexWrap: "wrap"
                }}>
                    <button
                        onClick={() => setFilter("all")}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: filter === "all" ? "rgba(255,107,53,0.15)" : "#1a1a1a",
                            border: `1px solid ${filter === "all" ? "#ff6b35" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: "8px",
                            color: filter === "all" ? "#ff6b35" : "#b0b0b0",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: filter === "all" ? "600" : "400",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                            if (filter !== "all") {
                                e.currentTarget.style.background = "#1e1e1e";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (filter !== "all") {
                                e.currentTarget.style.background = "#1a1a1a";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            }
                        }}
                    >
                        <Filter size={16} />
                        All ({history.length})
                    </button>
                    <button
                        onClick={() => setFilter("earned")}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: filter === "earned" ? "rgba(255,107,53,0.15)" : "#1a1a1a",
                            border: `1px solid ${filter === "earned" ? "#ff6b35" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: "8px",
                            color: filter === "earned" ? "#ff6b35" : "#b0b0b0",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: filter === "earned" ? "600" : "400",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                            if (filter !== "earned") {
                                e.currentTarget.style.background = "#1e1e1e";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (filter !== "earned") {
                                e.currentTarget.style.background = "#1a1a1a";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            }
                        }}
                    >
                        <ArrowUp size={16} />
                        Points Earned ({stats.earnedCount})
                    </button>
                    <button
                        onClick={() => setFilter("redeemed")}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: filter === "redeemed" ? "rgba(255,107,53,0.15)" : "#1a1a1a",
                            border: `1px solid ${filter === "redeemed" ? "#ff6b35" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: "8px",
                            color: filter === "redeemed" ? "#ff6b35" : "#b0b0b0",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: filter === "redeemed" ? "600" : "400",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                            if (filter !== "redeemed") {
                                e.currentTarget.style.background = "#1e1e1e";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (filter !== "redeemed") {
                                e.currentTarget.style.background = "#1a1a1a";
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            }
                        }}
                    >
                        <ArrowDown size={16} />
                        Rewards Redeemed ({stats.redeemedCount})
                    </button>
                </div>

                {loadingHistory ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#888888" }}>
                        Loading history...
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "3rem",
                        background: "#151515",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                    }}>
                        <Clock size={48} style={{ opacity: 0.3, marginBottom: "1rem", color: "#666" }} />
                        <p style={{ fontSize: "1.1rem", color: "#b0b0b0", marginBottom: "0.5rem" }}>
                            {filter === "all" ? "No history yet" : filter === "earned" ? "No points earned yet" : "No rewards redeemed yet"}
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#888888" }}>
                            {filter === "all" ? "Start earning points by completing bookings!" : filter === "earned" ? "Complete bookings to earn points!" : "Redeem your points for rewards!"}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {filteredHistory.map((transaction) => {
                            const isEarned = transaction.amount > 0;
                            const isRedemption = transaction.type === "redemption";
                            return (
                                <div
                                    key={transaction.id}
                                    style={{
                                        background: "#151515",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "16px",
                                        padding: "1.5rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1.5rem",
                                        transition: "all 0.2s ease",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#1a1a1a";
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#151515";
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                                    }}
                                >
                                    <div style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "50%",
                                        background: isEarned ? "rgba(255,107,53,0.15)" : "rgba(255,71,87,0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        {getTypeIcon(transaction.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.3rem", color: "#e0e0e0" }}>
                                            {getTypeLabel(transaction.type)}
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "#888888", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                            <Calendar size={14} />
                                            {formatDate(transaction.createdAt)}
                                        </div>
                                        {transaction.description && (
                                            <div style={{ fontSize: "0.85rem", color: "#a0a0a0", marginBottom: "0.3rem" }}>
                                                {transaction.description}
                                            </div>
                                        )}
                                        {/* Show redemption details */}
                                        {isRedemption && (
                                            <div style={{ 
                                                display: "flex", 
                                                flexDirection: "column", 
                                                gap: "0.5rem", 
                                                marginTop: "0.5rem",
                                                padding: "0.75rem",
                                                background: "#1a1a1a",
                                                borderRadius: "8px",
                                                border: "1px solid rgba(255,255,255,0.05)"
                                            }}>
                                                {transaction.discountAmount && (
                                                    <div style={{ fontSize: "0.85rem", color: "#ff6b35" }}>
                                                        💰 Discount: ₱{parseFloat(transaction.discountAmount).toFixed(2)}
                                                    </div>
                                                )}
                                                {transaction.walletUpdated && (
                                                    <div style={{ fontSize: "0.85rem", color: "#4ade80" }}>
                                                        ✅ Added to wallet
                                                    </div>
                                                )}
                                                {transaction.couponCode && (
                                                    <div style={{ 
                                                        display: "flex", 
                                                        alignItems: "center", 
                                                        gap: "0.5rem",
                                                        fontSize: "0.85rem"
                                                    }}>
                                                        <span style={{ color: "#888888" }}>🎫 Coupon Code:</span>
                                                        <span style={{ 
                                                            fontFamily: "monospace", 
                                                            color: "#ff6b35",
                                                            fontWeight: "600",
                                                            letterSpacing: "0.05em"
                                                        }}>
                                                            {transaction.couponCode}
                                                        </span>
                                                        <button
                                                            onClick={() => copyCouponCode(transaction.couponCode)}
                                                            style={{
                                                                padding: "0.25rem 0.5rem",
                                                                background: "rgba(255,107,53,0.15)",
                                                                border: "1px solid #ff6b35",
                                                                borderRadius: "4px",
                                                                color: "#ff6b35",
                                                                cursor: "pointer",
                                                                fontSize: "0.75rem",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.25rem",
                                                                transition: "all 0.2s ease"
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = "rgba(255,107,53,0.25)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = "rgba(255,107,53,0.15)";
                                                            }}
                                                        >
                                                            {copiedCouponCode === transaction.couponCode ? (
                                                                <>
                                                                    <CheckCircle size={12} />
                                                                    Copied
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={12} />
                                                                    Copy
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: "right", minWidth: "120px" }}>
                                        <div style={{
                                            fontSize: "1.3rem",
                                            fontWeight: "bold",
                                            color: isEarned ? "#ff6b35" : "#ff4757",
                                            marginBottom: "0.2rem"
                                        }}>
                                            {isEarned ? "+" : ""}{transaction.amount.toLocaleString()} pts
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "#888888" }}>
                                            Balance: {transaction.balanceAfter?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

