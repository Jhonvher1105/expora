import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";
import "./AdminDashboard.css";

export default function PaymentReview({ bookings }) {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filter, setFilter] = useState("all"); // all, pending, confirmed, rejected
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const transactionsRef = collection(db, "transactions");
        const q = query(transactionsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const paymentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
      } catch (error) {
        console.error("Error loading payments:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, []);

  useEffect(() => {
    let filtered = payments;

    // Filter by status
    if (filter !== "all") {
      filtered = filtered.filter(p => {
        if (filter === "pending") return p.status === "pending";
        if (filter === "confirmed") return p.status === "completed" || p.status === "confirmed";
        if (filter === "rejected") return p.status === "rejected" || p.status === "failed";
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.bookingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.paypalOrderId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  }, [filter, searchQuery, payments]);

  const handlePaymentAction = async (paymentId, action) => {
    try {
      const paymentRef = doc(db, "transactions", paymentId);
      await updateDoc(paymentRef, {
        status: action === "confirm" ? "confirmed" : "rejected",
        reviewedAt: new Date(),
        reviewedBy: "admin" // In production, use actual admin user ID
      });

      // Update payment in local state
      setPayments(prev => prev.map(p =>
        p.id === paymentId
          ? { ...p, status: action === "confirm" ? "confirmed" : "rejected", reviewedAt: new Date() }
          : p
      ));

      alert(`Payment ${action === "confirm" ? "confirmed" : "rejected"} successfully`);
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment status");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h2>Payment Review</h2>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-container">
          <Search className="admin-search-icon" size={20} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Payments Table - Desktop */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User ID</th>
              <th>Booking ID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-empty-state">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const date = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
                const statusClass = {
                  completed: "admin-status-confirmed",
                  confirmed: "admin-status-confirmed",
                  pending: "admin-status-pending",
                  rejected: "admin-status-cancelled",
                  failed: "admin-status-cancelled"
                }[payment.status] || "";

                return (
                  <tr key={payment.id}>
                    <td>{date.toLocaleDateString()}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.userId?.substring(0, 8)}...
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.bookingId?.substring(0, 8)}...
                    </td>
                    <td>{payment.type || "N/A"}</td>
                    <td style={{ fontWeight: "bold" }}>
                      ₱{payment.amount?.toLocaleString() || "0"}
                    </td>
                    <td>{payment.paymentMethod || "E-wallet"}</td>
                    <td>
                      <span className={`admin-status-badge ${statusClass}`}>
                        {payment.status?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </td>
                    <td>
                      {payment.status === "pending" ? (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handlePaymentAction(payment.id, "confirm")}
                            className="admin-btn admin-btn-success"
                          >
                            <CheckCircle size={14} />
                            Confirm
                          </button>
                          <button
                            onClick={() => handlePaymentAction(payment.id, "reject")}
                            className="admin-btn admin-btn-danger"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#6b7280", fontSize: "12px" }}>
                          {payment.status === "confirmed" || payment.status === "completed" ? "✓ Confirmed" : "✗ Rejected"}
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

      {/* Payments Cards - Mobile */}
      <div className="admin-card-list">
        {filteredPayments.length === 0 ? (
          <div className="admin-empty-state">No payments found</div>
        ) : (
          filteredPayments.map((payment) => {
            const date = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
            const statusClass = {
              completed: "admin-status-confirmed",
              confirmed: "admin-status-confirmed",
              pending: "admin-status-pending",
              rejected: "admin-status-cancelled",
              failed: "admin-status-cancelled"
            }[payment.status] || "";

            return (
              <div key={payment.id} className="admin-card-item">
                <div className="admin-card-item-header">
                  <div>
                    <div className="admin-card-item-value" style={{ fontSize: "16px", fontWeight: "600" }}>
                      ₱{payment.amount?.toLocaleString() || "0"}
                    </div>
                    <span className={`admin-status-badge ${statusClass}`}>
                      {payment.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>
                </div>
                <div className="admin-card-item-body">
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Date</span>
                    <span className="admin-card-item-value">{date.toLocaleDateString()}</span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">User ID</span>
                    <span className="admin-card-item-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.userId?.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Booking ID</span>
                    <span className="admin-card-item-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.bookingId?.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Type</span>
                    <span className="admin-card-item-value">{payment.type || "N/A"}</span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Payment Method</span>
                    <span className="admin-card-item-value">{payment.paymentMethod || "E-wallet"}</span>
                  </div>
                  {payment.status === "pending" && (
                    <div className="admin-card-item-actions">
                      <button
                        onClick={() => handlePaymentAction(payment.id, "confirm")}
                        className="admin-btn admin-btn-success"
                        style={{ flex: 1 }}
                      >
                        <CheckCircle size={14} />
                        Confirm
                      </button>
                      <button
                        onClick={() => handlePaymentAction(payment.id, "reject")}
                        className="admin-btn admin-btn-danger"
                        style={{ flex: 1 }}
                      >
                        <XCircle size={14} />
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

      {/* Summary */}
      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <div className="admin-summary-value">
            {filteredPayments.filter(p => p.status === "pending").length}
          </div>
          <div className="admin-summary-label">Pending</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value" style={{ color: "#10b981" }}>
            {filteredPayments.filter(p => p.status === "completed" || p.status === "confirmed").length}
          </div>
          <div className="admin-summary-label">Confirmed</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value" style={{ color: "#ef4444" }}>
            {filteredPayments.filter(p => p.status === "rejected" || p.status === "failed").length}
          </div>
          <div className="admin-summary-label">Rejected</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value">
            ₱{filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </div>
          <div className="admin-summary-label">Total Amount</div>
        </div>
      </div>
    </div>
  );
}

