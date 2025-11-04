import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../firebase";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star } from "lucide-react";

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
    return <div>Loading analytics...</div>;
  }

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Analytics Dashboard</h2>

      {/* Key Metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "16px",
        marginBottom: "32px"
      }}>
        <MetricCard
          title="Total Bookings"
          value={totalBookings}
          icon={Calendar}
          trend={confirmedBookings}
          trendLabel="Confirmed"
        />
        <MetricCard
          title="Total Revenue"
          value={`₱${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={pendingBookings}
          trendLabel="Pending"
        />
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          trend={listings.length}
          trendLabel="Hosts"
        />
        <MetricCard
          title="Total Listings"
          value={totalListings}
          icon={Star}
          trend={reviews.length}
          trendLabel="Reviews"
        />
      </div>

      {/* Booking Status Breakdown */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "24px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Booking Status</h3>
        <div style={{ display: "flex", gap: "24px" }}>
          <div>
            <div style={{ color: "#28a745", fontSize: "24px", fontWeight: "bold" }}>{confirmedBookings}</div>
            <div style={{ color: "#666" }}>Confirmed</div>
          </div>
          <div>
            <div style={{ color: "#ffc107", fontSize: "24px", fontWeight: "bold" }}>{pendingBookings}</div>
            <div style={{ color: "#666" }}>Pending</div>
          </div>
          <div>
            <div style={{ color: "#dc3545", fontSize: "24px", fontWeight: "bold" }}>{cancelledBookings}</div>
            <div style={{ color: "#666" }}>Cancelled</div>
          </div>
        </div>
      </div>

      {/* Best Reviewed Listings */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "24px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Best Reviewed Listings</h3>
        {bestReviewed.length > 0 ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {bestReviewed.map((item) => {
              const listing = getListingDetails(item.listingId);
              return (
                <div key={item.listingId} style={{
                  padding: "12px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{listing?.title || "Unknown Listing"}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {item.reviewCount} reviews • {item.averageRating.toFixed(1)} ⭐
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#666" }}>No reviews available</div>
        )}
      </div>

      {/* Lowest Reviewed Listings */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "24px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Lowest Reviewed Listings</h3>
        {lowestReviewed.length > 0 ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {lowestReviewed.map((item) => {
              const listing = getListingDetails(item.listingId);
              return (
                <div key={item.listingId} style={{
                  padding: "12px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{listing?.title || "Unknown Listing"}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {item.reviewCount} reviews • {item.averageRating.toFixed(1)} ⭐
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#666" }}>No reviews available</div>
        )}
      </div>

      {/* Monthly Revenue */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Monthly Revenue (Last 6 Months)</h3>
        {Object.keys(monthlyRevenue).length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {Object.entries(monthlyRevenue)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 6)
              .map(([month, revenue]) => (
                <div key={month} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px",
                  background: "#f8f9fa",
                  borderRadius: "4px"
                }}>
                  <span>{month}</span>
                  <span style={{ fontWeight: "bold" }}>₱{revenue.toLocaleString()}</span>
                </div>
              ))}
          </div>
        ) : (
          <div style={{ color: "#666" }}>No revenue data available</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendLabel }) {
  return (
    <div style={{
      background: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ color: "#666", fontSize: "14px" }}>{title}</div>
        <Icon size={20} color="#666" />
      </div>
      <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>{value}</div>
      {trend !== undefined && (
        <div style={{ fontSize: "12px", color: "#666" }}>
          {trendLabel}: {trend}
        </div>
      )}
    </div>
  );
}

