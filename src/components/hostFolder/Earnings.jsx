import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, Download, Calendar } from "lucide-react";
import Header from "./Hheader";
import PaymentHistory from "./PaymentHistory";

export default function Earnings({ showHeader = true }) {
  const [earnings, setEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  const loadEarnings = async (userId) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      
      // Get wallet earnings
      const walletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(walletRef);
      
      if (walletSnap.exists()) {
        const walletData = walletSnap.data();
        setEarnings(walletData.earnings || 0);
        setPendingEarnings(walletData.pendingEarnings || 0);
      }

      // Calculate total earnings from transactions
      const transactionsRef = collection(db, "transactions");
      const earningsQuery = query(
        transactionsRef,
        where("hostId", "==", userId),
        where("type", "==", "earnings"),
        where("status", "==", "completed")
      );
      const earningsSnap = await getDocs(earningsQuery);
      
      const total = earningsSnap.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0);
      }, 0);
      
      setTotalEarnings(total);
    } catch (error) {
      console.error("Error loading earnings:", error);
      setError("Failed to load earnings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutRequests = async (userId) => {
    if (!userId) return;
    try {
      const payoutRef = collection(db, "payoutRequests");
      const payoutQuery = query(
        payoutRef,
        where("hostId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const payoutSnap = await getDocs(payoutQuery);
      setPayoutRequests(payoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading payout requests:", error);
      // If index is missing or building, try fallback query without orderBy
      const isIndexError = error.code === "failed-precondition" || 
                          error.message?.includes("index") ||
                          error.message?.includes("currently building") ||
                          error.message?.includes("cannot be used yet");
      
      if (isIndexError) {
        try {
          console.log("Index is building or missing, using fallback query...");
          const payoutRef = collection(db, "payoutRequests");
          const fallbackQuery = query(
            payoutRef,
            where("hostId", "==", userId),
            limit(10)
          );
          const payoutSnap = await getDocs(fallbackQuery);
          const requests = payoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort in memory
          requests.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt || 0;
            return bTime - aTime;
          });
          setPayoutRequests(requests);
          // Clear any previous error since fallback worked
          if (error.message?.includes("currently building")) {
            console.log("Using temporary workaround while index builds. This may take a few minutes.");
          }
        } catch (fallbackError) {
          console.error("Fallback query also failed:", fallbackError);
          if (error.message?.includes("currently building")) {
            setError("Firestore index is building. Please wait a few minutes and refresh the page.");
          } else {
            setError("Failed to load payout requests. Please ensure Firestore indexes are created.");
          }
        }
      } else {
        setError("Failed to load payout requests. Please try again.");
      }
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadEarnings(user.uid);
        loadPayoutRequests(user.uid);
      } else {
        setLoading(false);
        setError("Please log in to view your earnings");
      }
    });
    return unsubscribe;
  }, []);

  const handleRequestPayout = async () => {
    if (!currentUser) {
      alert("Please log in to request a payout");
      return;
    }
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert("Please enter a valid payout amount");
      return;
    }

    const amount = parseFloat(payoutAmount);
    const MIN_PAYOUT = 500; // Minimum payout amount
    
    if (amount < MIN_PAYOUT) {
      alert(`Minimum payout amount is ₱${MIN_PAYOUT.toLocaleString()}`);
      return;
    }

    if (amount > earnings) {
      alert("Payout amount cannot exceed available earnings");
      return;
    }

    setRequestingPayout(true);
    setError(null);
    let payoutRequestId = null;
    
    try {
      const userId = currentUser.uid;
      
      // Get current wallet state first
      const walletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(walletRef);
      const currentEarnings = walletSnap.exists() ? (walletSnap.data().earnings || 0) : 0;
      const currentPending = walletSnap.exists() ? (walletSnap.data().pendingEarnings || 0) : 0;

      // Double-check earnings before proceeding
      if (amount > currentEarnings) {
        alert("Insufficient earnings. Please refresh and try again.");
        await loadEarnings(userId); // Reload to get latest data
        return;
      }

      // Create payout request
      const payoutRequestRef = await addDoc(collection(db, "payoutRequests"), {
        hostId: userId,
        amount: amount,
        method: payoutMethod,
        status: "pending",
        currency: "PHP",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      payoutRequestId = payoutRequestRef.id;

      // Update wallet - move from earnings to pending
      await setDoc(walletRef, {
        earnings: currentEarnings - amount,
        pendingEarnings: currentPending + amount,
        currency: "PHP",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      alert("Payout request submitted successfully! It will be processed within 3-5 business days.");
      setPayoutAmount("");
      await loadEarnings(userId);
      await loadPayoutRequests(userId);
    } catch (error) {
      console.error("Error requesting payout:", error);
      
      // If payout request was created but wallet update failed, try to delete the request
      if (payoutRequestId) {
        try {
          await deleteDoc(doc(db, "payoutRequests", payoutRequestId));
        } catch (deleteError) {
          console.error("Error cleaning up payout request:", deleteError);
        }
      }
      
      alert("Failed to submit payout request. Please try again.");
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div>
        {showHeader && <Header />}
        <div className="earnings-container">
          <div className="loading">Loading earnings...</div>
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div>
        {showHeader && <Header />}
        <div className="earnings-container">
          <div className="error-message" style={{ 
            textAlign: "center", 
            padding: "2rem", 
            color: "var(--error)",
            background: "var(--bg-800)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)"
          }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showHeader && <Header />}
      <div className="earnings-container">
        {error && (
          <div className="error-banner" style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            marginBottom: "1rem",
            color: "var(--error)"
          }}>
            {error}
          </div>
        )}
        <div className="earnings-header">
          <h1>Earnings & Payouts</h1>
          <p>Manage your earnings and request payouts</p>
        </div>

        {/* Tabs */}
        <div className="earnings-tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "payout" ? "active" : ""}
            onClick={() => setActiveTab("payout")}
          >
            Request Payout
          </button>
          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            Payment History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="earnings-overview">
            <div className="earnings-cards">
              <div className="earnings-card">
                <div className="earnings-card-icon" style={{ background: "#10b981" }}>
                  <DollarSign size={24} />
                </div>
                <div className="earnings-card-content">
                  <h3>Available Earnings</h3>
                  <p className="earnings-amount">₱{earnings.toLocaleString()}</p>
                  <span className="earnings-label">Ready to withdraw</span>
                </div>
              </div>

              <div className="earnings-card">
                <div className="earnings-card-icon" style={{ background: "#f59e0b" }}>
                  <Clock size={24} />
                </div>
                <div className="earnings-card-content">
                  <h3>Pending Payouts</h3>
                  <p className="earnings-amount">₱{pendingEarnings.toLocaleString()}</p>
                  <span className="earnings-label">Processing</span>
                </div>
              </div>

              <div className="earnings-card">
                <div className="earnings-card-icon" style={{ background: "#8b5cf6" }}>
                  <TrendingUp size={24} />
                </div>
                <div className="earnings-card-content">
                  <h3>Total Earnings</h3>
                  <p className="earnings-amount">₱{totalEarnings.toLocaleString()}</p>
                  <span className="earnings-label">All time</span>
                </div>
              </div>
            </div>

            {/* Recent Payout Requests */}
            <div className="recent-payouts">
              <h2>Recent Payout Requests</h2>
              {payoutRequests.length === 0 ? (
                <p className="no-data">No payout requests yet</p>
              ) : (
                <div className="payout-requests-list">
                  {payoutRequests.map((request) => (
                    <div key={request.id} className="payout-request-item">
                      <div className="payout-request-info">
                        <div className="payout-request-amount">₱{request.amount?.toLocaleString()}</div>
                        <div className="payout-request-details">
                          <span className="payout-method">{request.method}</span>
                          <span className="payout-date">
                            {request.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className={`payout-status payout-status-${request.status}`}>
                        {request.status === "pending" && <Clock size={16} />}
                        {request.status === "completed" && <CheckCircle size={16} />}
                        {request.status === "rejected" && <XCircle size={16} />}
                        <span>{request.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Payout Tab */}
        {activeTab === "payout" && (
          <div className="request-payout">
            <div className="payout-form-card">
              <h2>Request Payout</h2>
              <p className="available-earnings">Available: ₱{earnings.toLocaleString()}</p>

              <div className="form-group">
                <label>Payout Amount (PHP)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  max={earnings}
                  step="0.01"
                />
                <button
                  className="btn-max"
                  onClick={() => setPayoutAmount(earnings.toString())}
                >
                  Use Maximum
                </button>
              </div>

              <div className="form-group">
                <label>Payout Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                </select>
              </div>

              <button
                className="btn-request-payout"
                onClick={handleRequestPayout}
                disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0}
              >
                {requestingPayout ? "Processing..." : "Request Payout"}
              </button>

              <div className="payout-info">
                <p><strong>Processing Time:</strong> 3-5 business days</p>
                <p><strong>Minimum Payout:</strong> ₱500</p>
                <p><strong>Note:</strong> Payout requests are reviewed by admin before processing</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === "history" && <PaymentHistory />}
      </div>
    </div>
  );
}

