import { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, Calendar, Filter, X, DollarSign } from "lucide-react";
import "../cssFile/temp.css";
import Header from "./Header";
import HostHeader from "../hostFolder/Hheader";
import Footer from "../generalFile/Footer";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useWallet } from "../../context/WalletContext";

function WalletPage() {
    const [activeTab, setActiveTab] = useState("balance");
    const [currentUser, setCurrentUser] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    
    // Filters
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    
    // Host earnings
    const [hostEarnings, setHostEarnings] = useState(0);
    const [monthlyEarnings, setMonthlyEarnings] = useState(0);
    const [pendingEarnings, setPendingEarnings] = useState(0);

    const { balance } = useWallet();

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
                    
                    // Load host earnings if host
                    if (!propertiesSnap.empty) {
                        await loadHostEarnings(user.uid);
                    }
                } catch (error) {
                    console.error("Error checking host status:", error);
                }
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Load host earnings
    const loadHostEarnings = async (hostId) => {
        try {
            const walletRef = doc(db, "wallets", hostId);
            const walletSnap = await getDoc(walletRef);
            
            if (walletSnap.exists()) {
                const data = walletSnap.data();
                setHostEarnings(data.earnings || 0);
                setPendingEarnings(data.pendingEarnings || 0);
            } else {
                // Initialize host wallet
                setHostEarnings(0);
                setPendingEarnings(0);
            }

            // Calculate monthly earnings
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Query without orderBy to avoid index requirement
            const earningsQuery = query(
                collection(db, "transactions"),
                where("hostId", "==", hostId),
                where("type", "==", "earnings"),
                where("status", "==", "completed")
            );
            const earningsSnap = await getDocs(earningsQuery);
            
            let monthlyTotal = 0;
            earningsSnap.forEach((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || new Date(data.createdAt);
                if (createdAt >= startOfMonth) {
                    monthlyTotal += data.amount || 0;
                }
            });
            setMonthlyEarnings(monthlyTotal);
        } catch (error) {
            console.error("Error loading host earnings:", error);
        }
    };

    // Load transactions
    useEffect(() => {
        if (!currentUser) return;

        const loadTransactions = async () => {
            try {
                setLoading(true);
                let allTransactions = [];

                if (isHost) {
                    // Host: Get earnings transactions
                    const transactionsQuery = query(
                        collection(db, "transactions"),
                        where("hostId", "==", currentUser.uid)
                    );
                    const snapshot = await getDocs(transactionsQuery);
                    const transactionsData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    allTransactions = [...allTransactions, ...transactionsData];

                    // Host: Get withdrawal/payout transactions
                    const payoutTransactionsQuery = query(
                        collection(db, "payoutTransactions"),
                        where("hostId", "==", currentUser.uid)
                    );
                    const payoutSnapshot = await getDocs(payoutTransactionsQuery);
                    const payoutTransactionsData = payoutSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                        type: "withdrawal", // Mark as withdrawal type
                    }));
                    allTransactions = [...allTransactions, ...payoutTransactionsData];
                } else {
                    // Guest: Get payment transactions
                    const transactionsQuery = query(
                        collection(db, "transactions"),
                        where("userId", "==", currentUser.uid)
                    );
                    const snapshot = await getDocs(transactionsQuery);
                    const transactionsData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    allTransactions = [...allTransactions, ...transactionsData];
                }

                // Sort all transactions by createdAt/processedAt descending (newest first)
                allTransactions.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : 
                                 a.processedAt?.toDate ? a.processedAt.toDate() : 
                                 new Date(a.createdAt || a.processedAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : 
                                 b.processedAt?.toDate ? b.processedAt.toDate() : 
                                 new Date(b.createdAt || b.processedAt || 0);
                    return dateB - dateA;
                });

                setTransactions(allTransactions);
                setFilteredTransactions(allTransactions);
            } catch (error) {
                console.error("Error loading transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, [currentUser, isHost]);

    // Apply filters
    useEffect(() => {
        let filtered = [...transactions];

        // Filter by type
        if (filterType !== "all") {
            filtered = filtered.filter((t) => {
                if (isHost) {
                    return t.type === filterType;
                } else {
                    return t.type === filterType || (filterType === "payment" && (t.type === "payment" || t.type === "paypal_payment"));
                }
            });
        }

        // Filter by status
        if (filterStatus !== "all") {
            filtered = filtered.filter((t) => t.status === filterStatus);
        }

        // Filter by date range
        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((t) => {
                const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : 
                             t.processedAt?.toDate ? t.processedAt.toDate() : 
                             new Date(t.createdAt || t.processedAt || 0);
                return tDate >= fromDate;
            });
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((t) => {
                const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : 
                             t.processedAt?.toDate ? t.processedAt.toDate() : 
                             new Date(t.createdAt || t.processedAt || 0);
                return tDate <= toDate;
            });
        }

        setFilteredTransactions(filtered);
    }, [filterType, filterStatus, filterDateFrom, filterDateTo, transactions, isHost]);

    const formatDate = (timestamp) => {
        if (!timestamp) return "N/A";
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAmount = (amount) => {
        return `₱${Number(amount).toFixed(2)}`;
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            payment: "Payment",
            paypal_payment: "PayPal Payment",
            earnings: "Earnings",
            refund: "Refund",
            topup: "Top-up",
            withdrawal: "Withdrawal",
            payout: "Payout",
            service_fee: "Service Fee",
        };
        return labels[type] || type;
    };

    const getStatusColor = (status) => {
        const colors = {
            completed: "#10b981",
            pending: "#f59e0b",
            failed: "#ef4444",
        };
        return colors[status] || "#6b7280";
    };

    const clearFilters = () => {
        setFilterType("all");
        setFilterStatus("all");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    if (loading) {
        return (
            <div>
                {isHost ? <HostHeader /> : <Header />}
                <div style={{ padding: "100px 20px", textAlign: "center" }}>
                    <p>Loading wallet...</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div>
            {isHost ? <HostHeader /> : <Header />}
            <div className="wallet-page">
                <div className="wallet-container">
                    <h1 className="wallet-title">
                        <Wallet size={28} style={{ marginRight: "12px" }} />
                        E-Wallet
                    </h1>

                    {/* Tabs */}
                    <div className="wallet-tabs">
                        <button
                            className={`wallet-tab ${activeTab === "balance" ? "active" : ""}`}
                            onClick={() => setActiveTab("balance")}
                        >
                            Balance
                        </button>
                        <button
                            className={`wallet-tab ${activeTab === "transactions" ? "active" : ""}`}
                            onClick={() => setActiveTab("transactions")}
                        >
                            Transactions
                        </button>
                    </div>

                    {/* Balance Tab */}
                    {activeTab === "balance" && (
                        <div className="wallet-balance-content">
                            {isHost ? (
                                <>
                                    <div className="balance-card earnings-card">
                                        <div className="balance-card-header">
                                            <TrendingUp size={24} color="#10b981" />
                                            <h3>Total Earnings</h3>
                                        </div>
                                        <div className="balance-amount">{formatAmount(hostEarnings)}</div>
                                        <p className="balance-label">All-time earnings from bookings</p>
                                    </div>

                                    <div className="balance-stats">
                                        <div className="balance-stat-card">
                                            <div className="stat-label">This Month</div>
                                            <div className="stat-value">{formatAmount(monthlyEarnings)}</div>
                                        </div>
                                        <div className="balance-stat-card">
                                            <div className="stat-label">Pending</div>
                                            <div className="stat-value">{formatAmount(pendingEarnings)}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="balance-card">
                                    <div className="balance-card-header">
                                        <Wallet size={24} color="#f97316" />
                                        <h3>Current Balance</h3>
                                    </div>
                                    <div className="balance-amount">{formatAmount(balance)}</div>
                                    <p className="balance-label">Available for bookings</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === "transactions" && (
                        <div className="wallet-transactions-content">
                            {/* Filters */}
                            <div className="transactions-header">
                                <h2>Transaction History</h2>
                                <button
                                    className="filter-toggle-btn"
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    <Filter size={18} />
                                    Filters
                                </button>
                            </div>

                            {showFilters && (
                                <div className="transactions-filters">
                                    <div className="filter-group">
                                        <label>Type</label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                        >
                                            <option value="all">All Types</option>
                                            {isHost ? (
                                                <>
                                                    <option value="earnings">Earnings</option>
                                                    <option value="withdrawal">Withdrawal</option>
                                                    <option value="refund">Refund</option>
                                                    <option value="service_fee">Service Fee</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="payment">Payment</option>
                                                    <option value="refund">Refund</option>
                                                    <option value="topup">Top-up</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    <div className="filter-group">
                                        <label>Status</label>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="completed">Completed</option>
                                            <option value="pending">Pending</option>
                                            <option value="failed">Failed</option>
                                        </select>
                                    </div>

                                    <div className="filter-group">
                                        <label>From Date</label>
                                        <input
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-group">
                                        <label>To Date</label>
                                        <input
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                        />
                                    </div>

                                    <button className="clear-filters-btn" onClick={clearFilters}>
                                        <X size={16} />
                                        Clear
                                    </button>
                                </div>
                            )}

                            {/* Transactions List */}
                            <div className="transactions-list">
                                {filteredTransactions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No transactions found</p>
                                    </div>
                                ) : (
                                    filteredTransactions.map((transaction) => (
                                        <div key={transaction.id} className="transaction-item">
                                            <div className="transaction-icon">
                                                {(isHost && (transaction.type === "earnings" || transaction.type === "service_fee")) ? (
                                                    <TrendingUp size={20} color="#10b981" />
                                                ) : (
                                                    <TrendingDown size={20} color="#ef4444" />
                                                )}
                                            </div>
                                            <div className="transaction-details">
                                                <div className="transaction-type">
                                                    {getTransactionTypeLabel(transaction.type)}
                                                </div>
                                                <div className="transaction-meta">
                                                    {formatDate(transaction.createdAt || transaction.processedAt)}
                                                    {transaction.bookingId && (
                                                        <span className="booking-id">
                                                            Booking: {transaction.bookingId.substring(0, 8)}...
                                                        </span>
                                                    )}
                                                    {transaction.payoutRequestId && (
                                                        <span className="booking-id">
                                                            Payout: {transaction.payoutRequestId.substring(0, 8)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="transaction-amount">
                                                <div
                                                    className={`amount ${(isHost && (transaction.type === "earnings" || transaction.type === "service_fee")) ? "positive" : "negative"}`}
                                                >
                                                    {(isHost && (transaction.type === "earnings" || transaction.type === "service_fee")) ? "+" : "-"}
                                                    {formatAmount(transaction.amount)}
                                                </div>
                                                <div
                                                    className="transaction-status"
                                                    style={{ color: getStatusColor(transaction.status) }}
                                                >
                                                    {transaction.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default WalletPage;

