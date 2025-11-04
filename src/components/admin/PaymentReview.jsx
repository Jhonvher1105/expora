import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

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
    return <div>Loading payments...</div>;
  }

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Payment Review</h2>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: "16px",
        marginBottom: "24px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by booking ID, user ID, or PayPal order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              minWidth: "300px"
            }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px"
          }}
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Payments Table */}
      <div style={{
        background: "#fff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
              <th style={{ padding: "12px", textAlign: "left" }}>User ID</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Booking ID</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Payment Method</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const date = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
                const statusColor = {
                  completed: "#28a745",
                  confirmed: "#28a745",
                  pending: "#ffc107",
                  rejected: "#dc3545",
                  failed: "#dc3545"
                }[payment.status] || "#666";

                return (
                  <tr key={payment.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>{date.toLocaleDateString()}</td>
                    <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.userId?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                      {payment.bookingId?.substring(0, 8)}...
                    </td>
                    <td style={{ padding: "12px" }}>{payment.type || "N/A"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold" }}>
                      ₱{payment.amount?.toLocaleString() || "0"}
                    </td>
                    <td style={{ padding: "12px" }}>{payment.paymentMethod || "E-wallet"}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: statusColor + "20",
                        color: statusColor,
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {payment.status?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {payment.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            onClick={() => handlePaymentAction(payment.id, "confirm")}
                            style={{
                              padding: "4px 12px",
                              background: "#28a745",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <CheckCircle size={14} />
                            Confirm
                          </button>
                          <button
                            onClick={() => handlePaymentAction(payment.id, "reject")}
                            style={{
                              padding: "4px 12px",
                              background: "#dc3545",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                      {payment.status !== "pending" && (
                        <span style={{ color: "#666", fontSize: "12px" }}>
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

      {/* Summary */}
      <div style={{
        marginTop: "24px",
        padding: "16px",
        background: "#f8f9fa",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-around"
      }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {filteredPayments.filter(p => p.status === "pending").length}
          </div>
          <div style={{ color: "#666" }}>Pending</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
            {filteredPayments.filter(p => p.status === "completed" || p.status === "confirmed").length}
          </div>
          <div style={{ color: "#666" }}>Confirmed</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
            {filteredPayments.filter(p => p.status === "rejected" || p.status === "failed").length}
          </div>
          <div style={{ color: "#666" }}>Rejected</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            ₱{filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </div>
          <div style={{ color: "#666" }}>Total Amount</div>
        </div>
      </div>
    </div>
  );
}

