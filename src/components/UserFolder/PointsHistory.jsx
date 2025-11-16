import { useState, useEffect } from "react";
import { Clock, ArrowUp, ArrowDown, Gift, Calendar } from "lucide-react";
import { usePoints } from "../../context/PointsContext";
import Header from "../UserFolder/Header";

export default function PointsHistory() {
    const { getPointsHistory, loading } = usePoints();
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const data = await getPointsHistory(100);
            setHistory(data);
        } catch (error) {
            console.error("Error loading points history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "booking":
            case "first_booking":
            case "host_booking":
            case "host_first_booking":
            case "host_bonus":
            case "bonus":
                return <ArrowUp size={20} color="var(--primary)" />;
            case "referral":
                return <Gift size={20} color="var(--primary)" />;
            case "redemption":
                return <ArrowDown size={20} color="#ef4444" />;
            default:
                return <Clock size={20} />;
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
            <Header />
            <div className="points-history-page" style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", color: "var(--text)" }}>
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Points History
                    </h1>
                    <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
                        Track all your points transactions
                    </p>
                </div>

                {loadingHistory ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.5)" }}>
                        Loading history...
                    </div>
                ) : history.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "3rem",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px"
                    }}>
                        <Clock size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
                        <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                            No points history yet
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>
                            Start earning points by completing bookings!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {history.map((transaction) => {
                            const isEarned = transaction.amount > 0;
                            return (
                                <div
                                    key={transaction.id}
                                    style={{
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "16px",
                                        padding: "1.5rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1.5rem",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <div style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "50%",
                                        background: isEarned ? "rgba(255,107,53,0.2)" : "rgba(239,68,68,0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        {getTypeIcon(transaction.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.3rem" }}>
                                            {getTypeLabel(transaction.type)}
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <Calendar size={14} />
                                            {formatDate(transaction.createdAt)}
                                        </div>
                                        {transaction.description && (
                                            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginTop: "0.3rem" }}>
                                                {transaction.description}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{
                                            fontSize: "1.3rem",
                                            fontWeight: "bold",
                                            color: isEarned ? "var(--primary)" : "#ef4444",
                                            marginBottom: "0.2rem"
                                        }}>
                                            {isEarned ? "+" : ""}{transaction.amount.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
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

