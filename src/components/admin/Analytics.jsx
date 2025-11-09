import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../firebase";
import "./AdminDashboard.css";

export default function Analytics({ bookings, listings, users }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const reviewsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, []);

  // Calculate statistics
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalUsers = users.length;
  const totalListings = listings.length;

  // Booking status breakdown
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;

  // Revenue by month (last 6 months)
  const monthlyRevenue = {};
  bookings.forEach(booking => {
    if (booking.createdAt) {
      const date = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.totalPrice || 0);
    }
  });

  // Best and lowest reviewed listings
  const listingRatings = {};
  reviews.forEach(review => {
    if (review.listingId) {
      if (!listingRatings[review.listingId]) {
        listingRatings[review.listingId] = { total: 0, count: 0, reviews: [] };
      }
      listingRatings[review.listingId].total += review.rating || 0;
      listingRatings[review.listingId].count += 1;
      listingRatings[review.listingId].reviews.push(review);
    }
  });

  const listingAverages = Object.entries(listingRatings).map(([id, data]) => ({
    listingId: id,
    averageRating: data.total / data.count,
    reviewCount: data.count,
    reviews: data.reviews
  }));

  const bestReviewed = listingAverages.sort((a, b) => b.averageRating - a.averageRating).slice(0, 5);
  const lowestReviewed = listingAverages.sort((a, b) => a.averageRating - b.averageRating).slice(0, 5);

  // Find listing details
  const getListingDetails = (listingId) => {
    return listings.find(l => l.id === listingId);
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h2>Analytics Dashboard</h2>
      </div>

      {/* Key Metrics */}
      <div className="admin-metrics-grid">
        <MetricCard
          title="Total Bookings"
          value={totalBookings}
          color="#ff6b35"
          icon="📅"
          trend={confirmedBookings}
          trendLabel="Confirmed"
        />
        <MetricCard
          title="Total Revenue"
          value={`₱${totalRevenue.toLocaleString()}`}
          color="#10b981"
          icon="💰"
          trend={pendingBookings}
          trendLabel="Pending"
        />
        <MetricCard
          title="Total Users"
          value={totalUsers}
          color="#8b5cf6"
          icon="👥"
          trend={listings.length}
          trendLabel="Hosts"
        />
        <MetricCard
          title="Total Listings"
          value={totalListings}
          color="#f59e0b"
          icon="🏠"
          trend={reviews.length}
          trendLabel="Reviews"
        />
      </div>

      {/* Booking Status Breakdown */}
      <div className="admin-card">
        <h3 className="admin-card-title">Booking Status</h3>
        <div className="admin-summary-grid">
          <div className="admin-summary-card">
            <div className="admin-summary-value" style={{ color: "#10b981" }}>{confirmedBookings}</div>
            <div className="admin-summary-label">Confirmed</div>
          </div>
          <div className="admin-summary-card">
            <div className="admin-summary-value" style={{ color: "#f59e0b" }}>{pendingBookings}</div>
            <div className="admin-summary-label">Pending</div>
          </div>
          <div className="admin-summary-card">
            <div className="admin-summary-value" style={{ color: "#ef4444" }}>{cancelledBookings}</div>
            <div className="admin-summary-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Best Reviewed Listings */}
      <div className="admin-card">
        <h3 className="admin-card-title">Best Reviewed Listings</h3>
        {bestReviewed.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bestReviewed.map((item) => {
              const listing = getListingDetails(item.listingId);
              return (
                <div key={item.listingId} style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#ffffff" }}>{listing?.title || "Unknown Listing"}</div>
                    <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)" }}>
                      {item.reviewCount} reviews • {item.averageRating.toFixed(1)} ⭐
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">No reviews available</div>
        )}
      </div>

      {/* Lowest Reviewed Listings */}
      <div className="admin-card">
        <h3 className="admin-card-title">Lowest Reviewed Listings</h3>
        {lowestReviewed.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {lowestReviewed.map((item) => {
              const listing = getListingDetails(item.listingId);
              return (
                <div key={item.listingId} style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#ffffff" }}>{listing?.title || "Unknown Listing"}</div>
                    <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)" }}>
                      {item.reviewCount} reviews • {item.averageRating.toFixed(1)} ⭐
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">No reviews available</div>
        )}
      </div>

      {/* Monthly Revenue */}
      <div className="admin-card">
        <h3 className="admin-card-title">Monthly Revenue (Last 6 Months)</h3>
        {Object.keys(monthlyRevenue).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(monthlyRevenue)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 6)
              .map(([month, revenue]) => (
                <div key={month} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px"
                }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{month}</span>
                  <span style={{ fontWeight: "700", color: "#ff6b35" }}>₱{revenue.toLocaleString()}</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="admin-empty-state">No revenue data available</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, trend, trendLabel }) {
  return (
    <div className="admin-metric-card" style={{ borderLeftColor: color }}>
      <div className="admin-metric-header">
        <span className="admin-metric-icon">{icon}</span>
        <span className="admin-metric-title">{title}</span>
      </div>
      <div className="admin-metric-value" style={{ color: color }}>{value}</div>
      {trend !== undefined && (
        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginTop: "8px" }}>
          {trendLabel}: {trend}
        </div>
      )}
    </div>
  );
}

