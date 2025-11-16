import { useState, useEffect } from "react";
import { Gift, Sparkles, CheckCircle, AlertCircle, TrendingUp, Info } from "lucide-react";
import { usePoints } from "../../context/PointsContext";
import Header from "./Header";
import HostHeader from "../hostFolder/Hheader";
import "../cssFile/temp.css";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Rewards() {
    const { points, loading, redeemPoints, convertPointsToDiscount, getConversionRate, getPointsHistory } = usePoints();
    const [pointsToRedeem, setPointsToRedeem] = useState("");
    const [redeeming, setRedeeming] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [recentRedemptions, setRecentRedemptions] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [redemptionType, setRedemptionType] = useState("both"); // "wallet", "coupon", or "both"
    const [copiedCouponCode, setCopiedCouponCode] = useState(null);
    const [lastRedemptionResult, setLastRedemptionResult] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isHost, setIsHost] = useState(false);

    const conversionRate = getConversionRate();

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
        loadRecentRedemptions();
    }, []);

    const loadRecentRedemptions = async () => {
        try {
            setLoadingHistory(true);
            const history = await getPointsHistory(10);
            // Filter only redemption transactions
            const redemptions = history.filter(t => t.type === "redemption");
            setRecentRedemptions(redemptions);
        } catch (error) {
            console.error("Error loading redemption history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const calculateDiscount = (pointsAmount) => {
        if (!pointsAmount || pointsAmount <= 0) return 0;
        return parseFloat(convertPointsToDiscount(pointsAmount));
    };

    const handlePointsChange = (e) => {
        const value = e.target.value;
        // Only allow numbers
        if (value === "" || /^\d+$/.test(value)) {
            setPointsToRedeem(value);
            setMessage({ type: "", text: "" });
        }
    };

    const handleQuickRedeem = (pointsAmount) => {
        if (pointsAmount > points) {
            setMessage({ type: "error", text: "Insufficient points" });
            return;
        }
        setPointsToRedeem(pointsAmount.toString());
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

    const handleRedeem = async () => {
        const pointsValue = parseInt(pointsToRedeem);
        
        // Validation
        if (!pointsValue || pointsValue <= 0) {
            setMessage({ type: "error", text: "Please enter a valid points amount" });
            return;
        }

        if (pointsValue < conversionRate.pointsToPeso) {
            setMessage({ type: "error", text: `Minimum redemption is ${conversionRate.pointsToPeso} points` });
            return;
        }

        if (pointsValue > points) {
            setMessage({ type: "error", text: "Insufficient points" });
            return;
        }

        const discountAmount = calculateDiscount(pointsValue);
        const description = `Points redeemed: ${pointsValue.toLocaleString()} points = ₱${discountAmount} discount`;

        try {
            setRedeeming(true);
            setMessage({ type: "", text: "" });
            setLastRedemptionResult(null);

            const result = await redeemPoints(
                pointsValue,
                discountAmount,
                description,
                redemptionType
            );

            if (result.success) {
                let successMessage = `Successfully redeemed ${pointsValue.toLocaleString()} points!`;
                
                if (result.walletUpdated) {
                    successMessage += ` ₱${discountAmount} has been added to your wallet balance.`;
                }
                
                if (result.couponCode) {
                    successMessage += ` Coupon code generated: ${result.couponCode}`;
                }

                setMessage({ 
                    type: "success", 
                    text: successMessage
                });
                
                setLastRedemptionResult(result);
                setPointsToRedeem("");
                // Reload redemption history
                await loadRecentRedemptions();
            }
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Failed to redeem points. Please try again." });
        } finally {
            setRedeeming(false);
        }
    };

    // Predefined redemption tiers
    const redemptionTiers = [
        { points: 500, discount: 5, label: "₱5 Off" },
        { points: 1000, discount: 10, label: "₱10 Off" },
        { points: 2500, discount: 25, label: "₱25 Off" },
        { points: 5000, discount: 50, label: "₱50 Off" },
    ];

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

    const discountAmount = calculateDiscount(pointsToRedeem);

    return (
        <>
            {isHost ? <HostHeader /> : <Header />}
            <div className="rewards-page" style={{ 
                padding: "2rem", 
                maxWidth: "1200px", 
                margin: "0 auto", 
                color: "var(--text)",
                background: "var(--bg-900)",
                minHeight: "100vh"
            }}>
                {/* Header Section */}
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
                            <h1 style={{ fontSize: "2.5rem", margin: 0, background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                Rewards & Redemptions
                            </h1>
                            <p style={{ fontSize: "1rem", color: "var(--text-muted)", margin: 0 }}>
                                Convert your points into discounts
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
                    gap: "2rem", 
                    marginBottom: "2rem"
                }}>
                    {/* Left Column - Points Balance & Conversion Info */}
                    <div>
                        {/* Points Balance Card */}
                        <div style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "16px",
                            padding: "2rem",
                            marginBottom: "1.5rem",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                <Sparkles size={24} color="var(--primary)" />
                                <h2 style={{ fontSize: "1.5rem", margin: 0, color: "var(--text)" }}>Your Points Balance</h2>
                            </div>
                            {loading ? (
                                <div style={{ color: "var(--text-tertiary)" }}>Loading...</div>
                            ) : (
                                <div style={{ fontSize: "3rem", fontWeight: "bold", background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                    {points.toLocaleString()}
                                </div>
                            )}
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                                Available for redemption
                            </p>
                        </div>

                        {/* Conversion Rate Info */}
                        <div style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "16px",
                            padding: "1.5rem",
                            backdropFilter: "blur(10px)"
                        }}>
                            <div style={{ display: "flex", alignItems: "start", gap: "1rem" }}>
                                <Info size={20} color="var(--primary)" style={{ marginTop: "2px" }} />
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", color: "var(--text)" }}>Conversion Rate</h3>
                                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, lineHeight: "1.6" }}>
                                        <strong style={{ color: "var(--text)" }}>{conversionRate.pointsToPeso} points</strong> = <strong style={{ color: "var(--primary)" }}>₱1</strong> discount
                                    </p>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>
                                        Minimum redemption: {conversionRate.pointsToPeso} points
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Redemption Form */}
                    <div>
                        <div style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "16px",
                            padding: "2rem",
                            backdropFilter: "blur(10px)"
                        }}>
                            <h2 style={{ fontSize: "1.5rem", margin: "0 0 1.5rem 0", color: "var(--text)" }}>Redeem Points</h2>

                            {/* Quick Redeem Tiers */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "block" }}>
                                    Quick Redeem Options:
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                                    {redemptionTiers.map((tier) => (
                                        <button
                                            key={tier.points}
                                            onClick={() => handleQuickRedeem(tier.points)}
                                            disabled={points < tier.points || redeeming}
                                            style={{
                                                padding: "1rem",
                                                background: points >= tier.points 
                                                    ? "var(--bg-surface)" 
                                                    : "var(--bg-surface)",
                                                border: points >= tier.points 
                                                    ? "1px solid var(--border-primary)" 
                                                    : "1px solid var(--border-light)",
                                                borderRadius: "12px",
                                                color: points >= tier.points ? "var(--text)" : "var(--text-disabled)",
                                                cursor: points >= tier.points && !redeeming ? "pointer" : "not-allowed",
                                                transition: "all 0.2s ease",
                                                textAlign: "center",
                                                opacity: points >= tier.points ? 1 : 0.5
                                            }}
                                            onMouseEnter={(e) => {
                                                if (points >= tier.points && !redeeming) {
                                                    e.currentTarget.style.background = "var(--bg-surface-hover)";
                                                    e.currentTarget.style.borderColor = "var(--primary)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (points >= tier.points && !redeeming) {
                                                    e.currentTarget.style.background = "var(--bg-surface)";
                                                    e.currentTarget.style.borderColor = "var(--border-primary)";
                                                }
                                            }}
                                        >
                                            <div style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.25rem", color: "var(--text)" }}>
                                                {tier.label}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                {tier.points.toLocaleString()} pts
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Redemption Input */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "block" }}>
                                    Or enter custom amount:
                                </label>
                                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        value={pointsToRedeem}
                                        onChange={handlePointsChange}
                                        placeholder={`Min ${conversionRate.pointsToPeso} points`}
                                        disabled={redeeming}
                                        style={{
                                            flex: 1,
                                            padding: "0.75rem 1rem",
                                            background: "var(--bg-700)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "8px",
                                            color: "var(--text)",
                                            fontSize: "1rem",
                                            outline: "none",
                                            transition: "all 0.2s ease"
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = "var(--primary)";
                                            e.currentTarget.style.background = "var(--bg-800)";
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = "var(--border)";
                                            e.currentTarget.style.background = "var(--bg-700)";
                                        }}
                                    />
                                    <div style={{ 
                                        fontSize: "0.9rem", 
                                        color: "var(--text-tertiary)",
                                        whiteSpace: "nowrap"
                                    }}>
                                        points
                                    </div>
                                </div>
                                {pointsToRedeem && !isNaN(parseInt(pointsToRedeem)) && (
                                    <div style={{ 
                                        marginTop: "0.5rem", 
                                        fontSize: "0.9rem", 
                                        color: "var(--primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem"
                                    }}>
                                        <TrendingUp size={16} />
                                        You'll receive: <strong style={{ color: "var(--text)" }}>₱{discountAmount.toFixed(2)}</strong> discount
                                    </div>
                                )}
                            </div>

                            {/* Redemption Type Selector */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "block" }}>
                                    Redemption Type:
                                </label>
                                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        onClick={() => setRedemptionType("both")}
                                        disabled={redeeming}
                                        style={{
                                            padding: "0.75rem 1.5rem",
                                            background: redemptionType === "both" 
                                                ? "rgba(255,107,53,0.2)" 
                                                : "var(--bg-surface)",
                                            border: `1px solid ${redemptionType === "both" 
                                                ? "var(--primary)" 
                                                : "var(--border)"}`,
                                            borderRadius: "8px",
                                            color: "var(--text)",
                                            cursor: redeeming ? "not-allowed" : "pointer",
                                            fontSize: "0.9rem",
                                            fontWeight: redemptionType === "both" ? "600" : "400",
                                            transition: "all 0.2s ease",
                                            opacity: redeeming ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!redeeming && redemptionType !== "both") {
                                                e.currentTarget.style.background = "var(--bg-surface-hover)";
                                                e.currentTarget.style.borderColor = "var(--border-strong)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!redeeming && redemptionType !== "both") {
                                                e.currentTarget.style.background = "var(--bg-surface)";
                                                e.currentTarget.style.borderColor = "var(--border)";
                                            }
                                        }}
                                    >
                                        Both (Wallet + Coupon)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRedemptionType("wallet")}
                                        disabled={redeeming}
                                        style={{
                                            padding: "0.75rem 1.5rem",
                                            background: redemptionType === "wallet" 
                                                ? "rgba(255,107,53,0.2)" 
                                                : "var(--bg-surface)",
                                            border: `1px solid ${redemptionType === "wallet" 
                                                ? "var(--primary)" 
                                                : "var(--border)"}`,
                                            borderRadius: "8px",
                                            color: "var(--text)",
                                            cursor: redeeming ? "not-allowed" : "pointer",
                                            fontSize: "0.9rem",
                                            fontWeight: redemptionType === "wallet" ? "600" : "400",
                                            transition: "all 0.2s ease",
                                            opacity: redeeming ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!redeeming && redemptionType !== "wallet") {
                                                e.currentTarget.style.background = "var(--bg-surface-hover)";
                                                e.currentTarget.style.borderColor = "var(--border-strong)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!redeeming && redemptionType !== "wallet") {
                                                e.currentTarget.style.background = "var(--bg-surface)";
                                                e.currentTarget.style.borderColor = "var(--border)";
                                            }
                                        }}
                                    >
                                        Wallet Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRedemptionType("coupon")}
                                        disabled={redeeming}
                                        style={{
                                            padding: "0.75rem 1.5rem",
                                            background: redemptionType === "coupon" 
                                                ? "rgba(255,107,53,0.2)" 
                                                : "var(--bg-surface)",
                                            border: `1px solid ${redemptionType === "coupon" 
                                                ? "var(--primary)" 
                                                : "var(--border)"}`,
                                            borderRadius: "8px",
                                            color: "var(--text)",
                                            cursor: redeeming ? "not-allowed" : "pointer",
                                            fontSize: "0.9rem",
                                            fontWeight: redemptionType === "coupon" ? "600" : "400",
                                            transition: "all 0.2s ease",
                                            opacity: redeeming ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!redeeming && redemptionType !== "coupon") {
                                                e.currentTarget.style.background = "var(--bg-surface-hover)";
                                                e.currentTarget.style.borderColor = "var(--border-strong)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!redeeming && redemptionType !== "coupon") {
                                                e.currentTarget.style.background = "var(--bg-surface)";
                                                e.currentTarget.style.borderColor = "var(--border)";
                                            }
                                        }}
                                    >
                                        Coupon Only
                                    </button>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>
                                    {redemptionType === "both" && "You'll receive both wallet credit and a coupon code"}
                                    {redemptionType === "wallet" && "Discount amount will be added to your wallet balance"}
                                    {redemptionType === "coupon" && "You'll receive a coupon code valid for 90 days"}
                                </p>
                            </div>

                            {/* Message Display */}
                            {message.text && (
                                <div style={{
                                    padding: "0.75rem 1rem",
                                    borderRadius: "8px",
                                    marginBottom: "1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    background: message.type === "success" 
                                        ? "rgba(16,185,129,0.1)" 
                                        : "rgba(239,68,68,0.1)",
                                    border: `1px solid ${message.type === "success" 
                                        ? "rgba(16,185,129,0.3)" 
                                        : "rgba(239,68,68,0.3)"}`,
                                    color: message.type === "success" ? "var(--success)" : "var(--error)"
                                }}>
                                    {message.type === "success" ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <AlertCircle size={20} />
                                    )}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* Show Coupon Code if Generated */}
                            {lastRedemptionResult?.couponCode && (
                                <div style={{
                                    padding: "1rem",
                                    background: "rgba(255,107,53,0.1)",
                                    border: "1px solid var(--border-primary)",
                                    borderRadius: "8px",
                                    marginBottom: "1rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.75rem",
                                    backdropFilter: "blur(10px)"
                                }}>
                                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                        Your Coupon Code:
                                    </div>
                                    <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: "1rem",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap"
                                    }}>
                                        <div style={{
                                            fontSize: "1.3rem",
                                            fontWeight: "bold",
                                            color: "var(--primary)",
                                            fontFamily: "monospace",
                                            letterSpacing: "0.1em"
                                        }}>
                                            {lastRedemptionResult.couponCode}
                                        </div>
                                        <button
                                            onClick={() => copyCouponCode(lastRedemptionResult.couponCode)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "var(--primary-gradient)",
                                                border: "none",
                                                borderRadius: "6px",
                                                color: "#fff",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                                fontWeight: "600",
                                                transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.opacity = "0.9";
                                                e.currentTarget.style.transform = "scale(1.02)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = "1";
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            {copiedCouponCode === lastRedemptionResult.couponCode ? "✓ Copied!" : "Copy Code"}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                        Valid for 90 days • Fixed discount: ₱{lastRedemptionResult.discountAmount}
                                    </div>
                                </div>
                            )}

                            {/* Redeem Button */}
                            <button
                                onClick={handleRedeem}
                                disabled={redeeming || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || points < parseInt(pointsToRedeem || 0)}
                                style={{
                                    width: "100%",
                                    padding: "1rem",
                                    background: redeeming || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || points < parseInt(pointsToRedeem || 0)
                                        ? "var(--bg-surface)"
                                        : "var(--primary-gradient)",
                                    border: redeeming || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || points < parseInt(pointsToRedeem || 0)
                                        ? "1px solid var(--border)"
                                        : "none",
                                    borderRadius: "12px",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    fontWeight: "600",
                                    cursor: redeeming || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || points < parseInt(pointsToRedeem || 0)
                                        ? "not-allowed"
                                        : "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    opacity: redeeming || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || points < parseInt(pointsToRedeem || 0) ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!redeeming && pointsToRedeem && parseInt(pointsToRedeem) > 0 && points >= parseInt(pointsToRedeem || 0)) {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "var(--shadow-primary)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!redeeming && pointsToRedeem && parseInt(pointsToRedeem) > 0 && points >= parseInt(pointsToRedeem || 0)) {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }
                                }}
                            >
                                {redeeming ? (
                                    <>
                                        <div className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}></div>
                                        Redeeming...
                                    </>
                                ) : (
                                    <>
                                        <Gift size={20} />
                                        Redeem Points
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Redemptions Section */}
                {recentRedemptions.length > 0 && (
                    <div style={{ marginTop: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text)" }}>Recent Redemptions</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {recentRedemptions.map((redemption) => (
                                <div
                                    key={redemption.id}
                                    style={{
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "12px",
                                        padding: "1.5rem",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        backdropFilter: "blur(10px)",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "var(--bg-surface-hover)";
                                        e.currentTarget.style.borderColor = "var(--border-strong)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "var(--bg-surface)";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text)" }}>
                                            {redemption.description || "Points Redeemed"}
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                            {formatDate(redemption.createdAt)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{
                                            fontSize: "1.3rem",
                                            fontWeight: "bold",
                                            color: "var(--error)",
                                            marginBottom: "0.2rem"
                                        }}>
                                            -{Math.abs(redemption.amount).toLocaleString()} pts
                                        </div>
                                        {redemption.discountAmount && (
                                            <div style={{ fontSize: "0.9rem", color: "var(--primary)" }}>
                                                ₱{parseFloat(redemption.discountAmount).toFixed(2)} discount
                                            </div>
                                        )}
                                        {redemption.couponCode && (
                                            <div style={{ fontSize: "0.85rem", color: "var(--primary)", marginTop: "0.25rem", fontFamily: "monospace" }}>
                                                Coupon: {redemption.couponCode}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

