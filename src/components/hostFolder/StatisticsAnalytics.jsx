import { useState, useEffect } from "react";
import { BarChart3, DollarSign, Calendar } from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function StatisticsAnalytics() {
    const [currentUser, setCurrentUser] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState({ thisYear: 0, lastYear: 0 });
    const [totalBookings, setTotalBookings] = useState(0);
    const [monthlyBookings, setMonthlyBookings] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const fetchBookings = async () => {
            try {
                setLoading(true);
                const q = query(
                    collection(db, "bookings"),
                    where("hostId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const bookingsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setBookings(bookingsData);
                calculateStatistics(bookingsData);
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    const calculateStatistics = (bookingsData) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;
        
        // Get last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: date.toLocaleDateString("en-US", { month: "short" }),
                monthIndex: date.getMonth(),
                year: date.getFullYear(),
                revenue: 0,
                bookings: 0
            });
        }

        // Filter paid bookings only
        const paidBookings = bookingsData.filter(
            (booking) => booking.paymentStatus === "paid"
        );

        // Calculate monthly revenue and bookings
        paidBookings.forEach((booking) => {
            let bookingDate;
            if (booking.createdAt) {
                bookingDate = booking.createdAt.toDate
                    ? booking.createdAt.toDate()
                    : new Date(booking.createdAt);
            } else {
                return; // Skip if no createdAt
            }

            const bookingMonth = bookingDate.getMonth();
            const bookingYear = bookingDate.getFullYear();

            // Calculate revenue (use hostEarnings if available, otherwise totalPrice - serviceFee)
            const revenue =
                booking.hostEarnings !== undefined
                    ? Number(booking.hostEarnings)
                    : Number(booking.totalPrice || 0) - Number(booking.serviceFee || 0);

            // Find matching month in last 6 months
            const monthData = months.find(
                (m) => m.monthIndex === bookingMonth && m.year === bookingYear
            );
            if (monthData) {
                monthData.revenue += revenue;
            }
        });

        setMonthlyRevenue(months);

        // Calculate total revenue for this year and last year
        let thisYearRevenue = 0;
        let lastYearRevenue = 0;

        paidBookings.forEach((booking) => {
            let bookingDate;
            if (booking.createdAt) {
                bookingDate = booking.createdAt.toDate
                    ? booking.createdAt.toDate()
                    : new Date(booking.createdAt);
            } else {
                return;
            }

            const bookingYear = bookingDate.getFullYear();
            const revenue =
                booking.hostEarnings !== undefined
                    ? Number(booking.hostEarnings)
                    : Number(booking.totalPrice || 0) - Number(booking.serviceFee || 0);

            if (bookingYear === currentYear) {
                thisYearRevenue += revenue;
            } else if (bookingYear === lastYear) {
                lastYearRevenue += revenue;
            }
        });

        setTotalRevenue({ thisYear: thisYearRevenue, lastYear: lastYearRevenue });
        
        // Total bookings count includes ALL bookings (not just paid)
        setTotalBookings(bookingsData.length);
        
        // Calculate monthly bookings for all bookings (not just paid)
        const monthlyBookingsData = months.map(m => ({ ...m, bookings: 0 }));
        bookingsData.forEach((booking) => {
            let bookingDate;
            if (booking.createdAt) {
                bookingDate = booking.createdAt.toDate
                    ? booking.createdAt.toDate()
                    : new Date(booking.createdAt);
            } else {
                return;
            }

            const bookingMonth = bookingDate.getMonth();
            const bookingYear = bookingDate.getFullYear();

            const monthData = monthlyBookingsData.find(
                (m) => m.monthIndex === bookingMonth && m.year === bookingYear
            );
            if (monthData) {
                monthData.bookings += 1;
            }
        });
        
        setMonthlyBookings(monthlyBookingsData);
    };

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    style={{
                        backgroundColor: "#374151",
                        border: "1px solid #4b5563",
                        borderRadius: "8px",
                        padding: "12px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                    }}
                >
                    <p style={{ color: "#e5e7eb", marginBottom: "4px", fontWeight: 600 }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <p
                            key={index}
                            style={{
                                color: entry.color,
                                margin: "2px 0"
                            }}
                        >
                            {entry.name}: ₱{entry.value?.toFixed(2) || "0.00"}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for bookings chart
    const BookingsTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    style={{
                        backgroundColor: "#374151",
                        border: "1px solid #4b5563",
                        borderRadius: "8px",
                        padding: "12px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
                    }}
                >
                    <p style={{ color: "#e5e7eb", marginBottom: "4px", fontWeight: 600 }}>
                        {label}
                    </p>
                    <p style={{ color: "#ef4444", margin: "2px 0" }}>
                        Bookings: {payload[0]?.value || 0}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                Loading statistics...
            </div>
        );
    }

    return (
        <div style={{ marginBottom: "3rem" }}>
            {/* Header */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <BarChart3 size={28} color="#10b981" />
                    <h2
                        style={{
                            fontSize: "1.875rem",
                            fontWeight: 700,
                            color: "#ffffff",
                            margin: 0
                        }}
                    >
                        Statistics & Analytics
                    </h2>
                </div>
                <p style={{ color: "#9ca3af", fontSize: "1rem", margin: 0, marginLeft: "2.5rem" }}>
                    Track your performance and growth over time.
                </p>
            </div>

            {/* Cards Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                    gap: "1.5rem",
                    marginBottom: "2rem"
                }}
            >
                {/* Card 1: Monthly Revenue */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#d1fae5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <BarChart3 size={20} color="#10b981" />
                        </div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
                            Monthly Revenue
                        </h3>
                    </div>
                    <div style={{ height: "200px", width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#6b7280"
                                    style={{ fontSize: "12px" }}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: "12px" }}
                                    tickFormatter={(value) => `₱${value.toFixed(1)}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: "#10b981", r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 2: Total Revenue */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#fef3c7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <DollarSign size={20} color="#f59e0b" />
                        </div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
                            Total Revenue
                        </h3>
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                            This Year
                        </p>
                        <div
                            style={{
                                backgroundColor: "#d1fae5",
                                borderRadius: "8px",
                                padding: "1rem",
                                textAlign: "center"
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "1.875rem",
                                    fontWeight: 700,
                                    color: "#1f2937",
                                    margin: 0
                                }}
                            >
                                ₱{totalRevenue.thisYear.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "4px",
                                    backgroundColor: "#10b981"
                                }}
                            />
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                {new Date().getFullYear()}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "4px",
                                    backgroundColor: "#fbbf24"
                                }}
                            />
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                {new Date().getFullYear() - 1}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Total Bookings */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#fee2e2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <Calendar size={20} color="#ef4444" />
                        </div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
                            Total Bookings
                        </h3>
                    </div>
                    <div style={{ marginBottom: "1rem", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "3rem",
                                fontWeight: 700,
                                color: "#1f2937",
                                margin: 0,
                                lineHeight: 1
                            }}
                        >
                            {totalBookings}
                        </p>
                    </div>
                    <div style={{ height: "150px", width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyBookings}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#6b7280"
                                    style={{ fontSize: "12px" }}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: "12px" }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<BookingsTooltip />} />
                                <Bar
                                    dataKey="bookings"
                                    fill="#ef4444"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

