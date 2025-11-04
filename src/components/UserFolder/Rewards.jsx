import { useState, useEffect } from "react";
import { Gift, Star, TrendingUp, Award, Sparkles } from "lucide-react";
import { usePoints } from "../../context/PointsContext";
import { useBooking } from "../../context/BookingContext";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Header from "../UserFolder/Header";

export default function RewardsPage() {
    const { points, loading, convertPointsToDiscount, getConversionRate } = usePoints();
    const [rewards, setRewards] = useState([]);
    const [userBookings, setUserBookings] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(true);

    useEffect(() => {
        loadRewards();
        loadUserBookingStats();
    }, []);

    const loadRewards = async () => {
        try {
            const q = query(collection(db, "rewards"), orderBy("pointsRequired", "asc"));
            const snap = await getDocs(q);
            const rewardsData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setRewards(rewardsData);
        } catch (error) {
            console.error("Error loading rewards:", error);
            // Set default rewards if collection doesn't exist
            setRewards([
                {
                    id: "1",
                    name: "₱10 Discount",
                    pointsRequired: 100,
                    description: "Get ₱10 off your next booking",
                    type: "discount",
                    value: 10,
                },
                {
                    id: "2",
                    name: "₱50 Discount",
                    pointsRequired: 500,
                    description: "Get ₱50 off your next booking",
                    type: "discount",
                    value: 50,
                },
                {
                    id: "3",
                    name: "₱100 Discount",
                    pointsRequired: 1000,
                    description: "Get ₱100 off your next booking",
                    type: "discount",
                    value: 100,
                },
            ]);
        } finally {
            setLoadingRewards(false);
        }
    };

    const loadUserBookingStats = async () => {
        if (!auth.currentUser) return;
        try {
            const q = query(
                collection(db, "bookings"),
                where("guestId", "==", auth.currentUser.uid),
                where("status", "==", "confirmed"),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            const snap = await getDocs(q);
            setUserBookings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error loading bookings:", error);
        }
    };

    const rate = getConversionRate();

    return (
        <>
            <Header />
            <div className="rewards-page" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", color: "var(--text)" }}>
                {/* Header Section */}
                <div style={{ marginBottom: "3rem" }}>
                    <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Rewards & Points
                    </h1>
                    <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.7)" }}>
                        Earn points on every booking and redeem them for discounts!
                    </p>
                </div>

                {/* Points Balance Card */}
                <div style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px",
                    padding: "2rem",
                    marginBottom: "2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "2rem"
                }}>
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background: "var(--primary-gradient)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem"
                    }}>
                        <Sparkles size={40} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>
                            Your Points Balance
                        </div>
                        {loading ? (
                            <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>Loading...</div>
                        ) : (
                            <>
                                <div style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                    {points.toLocaleString()}
                                </div>
                                <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>
                                    ≈ ₱{convertPointsToDiscount(points)} discount available
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Points Earning Info */}
                <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    marginBottom: "2rem"
                }}>
                    <h3 style={{ fontSize: "1.3rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <TrendingUp size={24} />
                        How to Earn Points
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                        <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>
                                10 points
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                                Per ₱100 spent on bookings
                            </div>
                        </div>
                        <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>
                                50 points
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                                First booking bonus
                            </div>
                        </div>
                        <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>
                                25 points
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                                Referral bonus (per referral)
                            </div>
                        </div>
                        <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>
                                20 points
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                                Repeat booking bonus
                            </div>
                        </div>
                    </div>
                </div>

                {/* Available Rewards */}
                <div>
                    <h3 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Gift size={28} />
                        Available Rewards
                    </h3>
                    {loadingRewards ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.5)" }}>
                            Loading rewards...
                        </div>
                    ) : rewards.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.5)" }}>
                            No rewards available yet
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                            {rewards.map((reward) => {
                                const canRedeem = points >= reward.pointsRequired;
                                return (
                                    <div
                                        key={reward.id}
                                        style={{
                                            background: canRedeem ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                                            border: canRedeem ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "16px",
                                            padding: "1.5rem",
                                            opacity: canRedeem ? 1 : 0.6,
                                            transition: "all 0.3s ease"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                                            <div>
                                                <h4 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                                    {reward.name}
                                                </h4>
                                                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
                                                    {reward.description}
                                                </p>
                                            </div>
                                            <Award size={24} color={canRedeem ? "var(--primary)" : "rgba(255,255,255,0.3)"} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                                            <div>
                                                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>
                                                    Points Required
                                                </div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                                                    {reward.pointsRequired.toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                disabled={!canRedeem}
                                                onClick={() => {
                                                    // Redemption will be handled in booking flow
                                                    alert(`To redeem this reward, use ${reward.pointsRequired} points at checkout!`);
                                                }}
                                                style={{
                                                    padding: "0.75rem 1.5rem",
                                                    background: canRedeem ? "var(--primary-gradient)" : "rgba(255,255,255,0.1)",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "12px",
                                                    cursor: canRedeem ? "pointer" : "not-allowed",
                                                    fontWeight: "600",
                                                    opacity: canRedeem ? 1 : 0.5
                                                }}
                                            >
                                                {canRedeem ? "Available" : "Not Enough Points"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Conversion Rate Info */}
                <div style={{
                    marginTop: "3rem",
                    padding: "1.5rem",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    textAlign: "center"
                }}>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
                        Conversion Rate: <strong>{rate.pointsToPeso} points = ₱1 discount</strong>
                    </p>
                </div>
            </div>
        </>
    );
}

