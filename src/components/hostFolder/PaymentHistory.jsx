import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Calendar, DollarSign, ArrowDown, Filter } from "lucide-react";

export default function PaymentHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, earnings, payout
  const [listings, setListings] = useState({});

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const transactionsRef = collection(db, "transactions");
      
      let q;
      if (filter === "earnings") {
        q = query(
          transactionsRef,
          where("hostId", "==", userId),
          where("type", "==", "earnings"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
      } else if (filter === "payout") {
        // Load payout requests
        try {
          const payoutRef = collection(db, "payoutRequests");
          const payoutQuery = query(
            payoutRef,
            where("hostId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(50)
          );
          const payoutSnap = await getDocs(payoutQuery);
          const payoutData = payoutSnap.docs.map(doc => ({
            id: doc.id,
            type: "payout",
            ...doc.data()
          }));
          setTransactions(payoutData);
          setLoading(false);
          return;
        } catch (payoutError) {
          // If index is missing or building, try fallback query without orderBy
          const isIndexError = payoutError.code === "failed-precondition" || 
                              payoutError.message?.includes("index") ||
                              payoutError.message?.includes("currently building") ||
                              payoutError.message?.includes("cannot be used yet");
          
          if (isIndexError) {
            try {
              console.log("Index is building or missing, using fallback query...");
              const payoutRef = collection(db, "payoutRequests");
              const fallbackQuery = query(
                payoutRef,
                where("hostId", "==", userId),
                limit(50)
              );
              const payoutSnap = await getDocs(fallbackQuery);
              let payoutData = payoutSnap.docs.map(doc => ({
                id: doc.id,
                type: "payout",
                ...doc.data()
              }));
              // Sort in memory
              payoutData.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt || 0;
                const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt || 0;
                return bTime - aTime;
              });
              setTransactions(payoutData);
              setLoading(false);
              if (payoutError.message?.includes("currently building")) {
                console.log("Using temporary workaround while index builds. This may take a few minutes.");
              }
              return;
            } catch (fallbackError) {
              console.error("Fallback query also failed:", fallbackError);
              throw payoutError; // Re-throw original error
            }
          } else {
            throw payoutError;
          }
        }
      } else {
        q = query(
          transactionsRef,
          where("hostId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(50)
        );
      }

      const snap = await getDocs(q);
      const transactionsData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load listing details for earnings transactions
      const listingIds = [...new Set(transactionsData
        .filter(t => t.bookingId && typeof t.bookingId === "string")
        .map(t => t.bookingId)
      )];

      const listingsData = {};
      for (const bookingId of listingIds) {
        if (!bookingId) continue;
        try {
          const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
          if (bookingDoc.exists()) {
            const bookingData = bookingDoc.data();
            listingsData[bookingId] = bookingData.listingTitle || "Unknown Listing";
          }
        } catch (error) {
          console.error("Error loading booking:", error);
        }
      }

      setListings(listingsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "earnings":
        return <ArrowDown size={20} className="icon-earnings" />;
      case "payout":
        return <DollarSign size={20} className="icon-payout" />;
      default:
        return <DollarSign size={20} />;
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
    return <div className="payment-history loading">Loading payment history...</div>;
  }

  return (
    <div className="payment-history">
      <div className="payment-history-header">
        <h2>Payment History</h2>
        <div className="payment-history-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "earnings" ? "active" : ""}
            onClick={() => setFilter("earnings")}
          >
            Earnings
          </button>
          <button
            className={filter === "payout" ? "active" : ""}
            onClick={() => setFilter("payout")}
          >
            Payouts
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="no-transactions">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="transaction-details">
                <div className="transaction-title">
                  {transaction.type === "earnings" && "Earnings from Booking"}
                  {transaction.type === "payout" && "Payout Request"}
                </div>
                <div className="transaction-meta">
                  {transaction.type === "earnings" && transaction.bookingId && (
                    <span className="transaction-listing">
                      {listings[transaction.bookingId] || "Unknown Listing"}
                    </span>
                  )}
                  {transaction.type === "payout" && (
                    <span className="transaction-method">
                      {transaction.method || "N/A"}
                    </span>
                  )}
                  <span className="transaction-date">
                    <Calendar size={14} />
                    {formatDate(transaction.createdAt)}
                  </span>
                </div>
              </div>
              <div className={`transaction-amount ${transaction.type}`}>
                {transaction.type === "earnings" && "+"}
                {transaction.type === "payout" && "-"}
                ₱{transaction.amount?.toLocaleString() || "0"}
              </div>
              <div className={`transaction-status status-${transaction.status}`}>
                {transaction.status || "completed"}
              </div>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="transaction-summary">
          <p>
            Total {filter === "all" ? "Transactions" : filter === "earnings" ? "Earnings" : "Payouts"}:{" "}
            <strong>
              ₱{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}

