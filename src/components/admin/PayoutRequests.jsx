import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, where, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { CheckCircle, XCircle, Clock, Search, DollarSign, User, Calendar } from "lucide-react";
import "./AdminDashboard.css";

export default function PayoutRequests() {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filter, setFilter] = useState("pending"); // pending, completed, rejected, all
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [hostNames, setHostNames] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadPayoutRequests();
  }, []);

  useEffect(() => {
    loadHostNames();
  }, [payoutRequests]);

  useEffect(() => {
    filterRequests();
  }, [filter, searchQuery, payoutRequests]);

  const loadPayoutRequests = async () => {
    try {
      setLoading(true);
      const payoutRef = collection(db, "payoutRequests");
      const q = query(payoutRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const requestsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayoutRequests(requestsData);
    } catch (error) {
      console.error("Error loading payout requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHostNames = async () => {
    const hostIds = [...new Set(payoutRequests.map(r => r.hostId))];
    const names = {};
    
    for (const hostId of hostIds) {
      if (!hostId) continue;
      try {
        const userDoc = await getDoc(doc(db, "users", hostId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          names[hostId] = userData.name || userData.email || "Unknown User";
        }
      } catch (error) {
        console.error("Error loading host name:", error);
      }
    }
    
    setHostNames(names);
  };

  const filterRequests = () => {
    let filtered = payoutRequests;

    // Filter by status
    if (filter !== "all") {
      filtered = filtered.filter(r => r.status === filter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.hostId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hostNames[r.hostId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprovePayout = async (payoutId) => {
    if (!window.confirm("Are you sure you want to approve this payout request? This action cannot be undone.")) {
      return;
    }

    setProcessingId(payoutId);
    try {
      const payoutRef = doc(db, "payoutRequests", payoutId);
      const payoutSnap = await getDoc(payoutRef);
      
      if (!payoutSnap.exists()) {
        alert("Payout request not found");
        return;
      }

      const payoutData = payoutSnap.data();
      const hostId = payoutData.hostId;
      const amount = payoutData.amount;

      // Get current wallet state
      const walletRef = doc(db, "wallets", hostId);
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        alert("Host wallet not found");
        return;
      }

      const walletData = walletSnap.data();
      const currentPending = walletData.pendingEarnings || 0;

      // Verify pending earnings is sufficient
      if (currentPending < amount) {
        alert("Host does not have sufficient pending earnings. Payout request may have been processed already.");
        await loadPayoutRequests();
        return;
      }

      // Update payout request status
      await updateDoc(payoutRef, {
        status: "completed",
        processedAt: serverTimestamp(),
        processedBy: "admin", // In production, use actual admin user ID
        updatedAt: serverTimestamp(),
      });

      // Update host wallet - remove from pendingEarnings (payout is completed)
      await setDoc(walletRef, {
        pendingEarnings: currentPending - amount,
        currency: "PHP",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Record completed payout transaction
      await addDoc(collection(db, "payoutTransactions"), {
        hostId: hostId,
        payoutRequestId: payoutId,
        amount: amount,
        method: payoutData.method,
        status: "completed",
        currency: "PHP",
        processedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      alert("Payout approved successfully!");
      await loadPayoutRequests();
    } catch (error) {
      console.error("Error approving payout:", error);
      alert("Failed to approve payout. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayout = async (payoutId, reason = "") => {
    const rejectReason = reason || prompt("Please provide a reason for rejection (optional):");
    
    if (reason === "" && rejectReason === null) {
      return; // User cancelled
    }

    setProcessingId(payoutId);
    try {
      const payoutRef = doc(db, "payoutRequests", payoutId);
      const payoutSnap = await getDoc(payoutRef);
      
      if (!payoutSnap.exists()) {
        alert("Payout request not found");
        return;
      }

      const payoutData = payoutSnap.data();
      const hostId = payoutData.hostId;
      const amount = payoutData.amount;

      // Get current wallet state
      const walletRef = doc(db, "wallets", hostId);
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        alert("Host wallet not found");
        return;
      }

      const walletData = walletSnap.data();
      const currentPending = walletData.pendingEarnings || 0;
      const currentEarnings = walletData.earnings || 0;

      // Verify pending earnings is sufficient
      if (currentPending < amount) {
        alert("Host does not have sufficient pending earnings. Payout request may have been processed already.");
        await loadPayoutRequests();
        return;
      }

      // Update payout request status
      await updateDoc(payoutRef, {
        status: "rejected",
        rejectReason: rejectReason || "No reason provided",
        processedAt: serverTimestamp(),
        processedBy: "admin", // In production, use actual admin user ID
        updatedAt: serverTimestamp(),
      });

      // Update host wallet - move from pendingEarnings back to earnings
      await setDoc(walletRef, {
        earnings: currentEarnings + amount,
        pendingEarnings: currentPending - amount,
        currency: "PHP",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Record rejected payout transaction
      await addDoc(collection(db, "payoutTransactions"), {
        hostId: hostId,
        payoutRequestId: payoutId,
        amount: amount,
        method: payoutData.method,
        status: "rejected",
        rejectReason: rejectReason || "No reason provided",
        currency: "PHP",
        processedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      alert("Payout rejected. Funds have been returned to host's earnings.");
      await loadPayoutRequests();
    } catch (error) {
      console.error("Error rejecting payout:", error);
      alert("Failed to reject payout. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading payout requests...</div>
      </div>
    );
  }

  const pendingCount = payoutRequests.filter(r => r.status === "pending").length;
  const completedCount = payoutRequests.filter(r => r.status === "completed").length;
  const rejectedCount = payoutRequests.filter(r => r.status === "rejected").length;
  const totalPendingAmount = payoutRequests
    .filter(r => r.status === "pending")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h2>Payout Requests</h2>
        <p>Review and manage host payout requests</p>
      </div>

      {/* Summary Cards */}
      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <div className="admin-summary-value" style={{ color: "#f59e0b" }}>
            {pendingCount}
          </div>
          <div className="admin-summary-label">Pending Requests</div>
          <div className="admin-summary-amount" style={{ fontSize: "14px", marginTop: "4px" }}>
            ₱{totalPendingAmount.toLocaleString()}
          </div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value" style={{ color: "#10b981" }}>
            {completedCount}
          </div>
          <div className="admin-summary-label">Completed</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value" style={{ color: "#ef4444" }}>
            {rejectedCount}
          </div>
          <div className="admin-summary-label">Rejected</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value">
            {payoutRequests.length}
          </div>
          <div className="admin-summary-label">Total Requests</div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-container">
          <Search className="admin-search-icon" size={20} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by host ID, name, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="all">All Requests</option>
        </select>
      </div>

      {/* Payout Requests Table - Desktop */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Host</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-empty-state">
                  No payout requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => {
                const date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
                const statusClass = {
                  pending: "admin-status-pending",
                  completed: "admin-status-confirmed",
                  rejected: "admin-status-cancelled"
                }[request.status] || "";

                return (
                  <tr key={request.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} style={{ opacity: 0.7 }} />
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <User size={16} style={{ opacity: 0.7 }} />
                        <div>
                          <div style={{ fontWeight: "500" }}>
                            {hostNames[request.hostId] || "Unknown Host"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "monospace" }}>
                            {request.hostId?.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "bold", fontSize: "16px" }}>
                      <DollarSign size={16} style={{ display: "inline", marginRight: "4px" }} />
                      ₱{request.amount?.toLocaleString() || "0"}
                    </td>
                    <td>
                      <span style={{ 
                        padding: "4px 8px", 
                        background: "rgba(255, 255, 255, 0.1)", 
                        borderRadius: "4px",
                        textTransform: "capitalize"
                      }}>
                        {request.method || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-status-badge ${statusClass}`}>
                        {request.status?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </td>
                    <td>
                      {request.status === "pending" ? (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleApprovePayout(request.id)}
                            className="admin-btn admin-btn-success"
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Clock size={14} className="spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayout(request.id)}
                            className="admin-btn admin-btn-danger"
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Clock size={14} className="spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Reject
                          </button>
                        </div>
                      ) : request.status === "rejected" && request.rejectReason ? (
                        <div style={{ fontSize: "12px", color: "#6b7280", maxWidth: "200px" }}>
                          Reason: {request.rejectReason}
                        </div>
                      ) : (
                        <span style={{ color: "#6b7280", fontSize: "12px" }}>
                          {request.status === "completed" ? "✓ Processed" : "✗ Rejected"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payout Requests Cards - Mobile */}
      <div className="admin-card-list">
        {filteredRequests.length === 0 ? (
          <div className="admin-empty-state">No payout requests found</div>
        ) : (
          filteredRequests.map((request) => {
            const date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
            const statusClass = {
              pending: "admin-status-pending",
              completed: "admin-status-confirmed",
              rejected: "admin-status-cancelled"
            }[request.status] || "";

            return (
              <div key={request.id} className="admin-card-item">
                <div className="admin-card-item-header">
                  <div>
                    <div className="admin-card-item-value" style={{ fontSize: "18px", fontWeight: "600" }}>
                      ₱{request.amount?.toLocaleString() || "0"}
                    </div>
                    <span className={`admin-status-badge ${statusClass}`}>
                      {request.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>
                </div>
                <div className="admin-card-item-body">
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Host</span>
                    <span className="admin-card-item-value">
                      {hostNames[request.hostId] || "Unknown Host"}
                    </span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Date</span>
                    <span className="admin-card-item-value">{formatDate(request.createdAt)}</span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Method</span>
                    <span className="admin-card-item-value" style={{ textTransform: "capitalize" }}>
                      {request.method || "N/A"}
                    </span>
                  </div>
                  {request.status === "rejected" && request.rejectReason && (
                    <div className="admin-card-item-row">
                      <span className="admin-card-item-label">Reason</span>
                      <span className="admin-card-item-value" style={{ fontSize: "12px", color: "#ef4444" }}>
                        {request.rejectReason}
                      </span>
                    </div>
                  )}
                  {request.status === "pending" && (
                    <div className="admin-card-item-actions">
                      <button
                        onClick={() => handleApprovePayout(request.id)}
                        className="admin-btn admin-btn-success"
                        disabled={processingId === request.id}
                        style={{ flex: 1 }}
                      >
                        {processingId === request.id ? (
                          <Clock size={14} className="spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectPayout(request.id)}
                        className="admin-btn admin-btn-danger"
                        disabled={processingId === request.id}
                        style={{ flex: 1 }}
                      >
                        {processingId === request.id ? (
                          <Clock size={14} className="spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

