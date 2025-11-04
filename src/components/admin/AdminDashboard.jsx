import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import AdminHeader from "./AdminHeader";
import Analytics from "./Analytics";
import PaymentReview from "./PaymentReview";
import ServiceFees from "./ServiceFees";
import PolicyCompliance from "./PolicyCompliance";
import Reports from "./Reports";
import UserManagement from "./UserManagement";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load bookings
      const bookingsRef = collection(db, "bookings");
      const bookingsSnap = await getDocs(bookingsRef);
      const bookingsData = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsData);

      // Load listings (combine all collections)
      const listingsData = [];
      
      const propertiesRef = collection(db, "properties");
      const propertiesSnap = await getDocs(propertiesRef);
      propertiesSnap.docs.forEach(doc => {
        listingsData.push({ id: doc.id, ...doc.data(), category: "properties" });
      });

      const experiencesRef = collection(db, "experiences");
      const experiencesSnap = await getDocs(experiencesRef);
      experiencesSnap.docs.forEach(doc => {
        listingsData.push({ id: doc.id, ...doc.data(), category: "experiences" });
      });

      const servicesRef = collection(db, "services");
      const servicesSnap = await getDocs(servicesRef);
      servicesSnap.docs.forEach(doc => {
        listingsData.push({ id: doc.id, ...doc.data(), category: "services" });
      });

      setListings(listingsData);

      // Load users
      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(usersRef);
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
          <div>Loading dashboard...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div style={{ padding: "24px" }}>
            <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Dashboard Overview</h2>
            
            {/* Key Metrics */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "32px"
            }}>
              <MetricCard title="Total Bookings" value={bookings.length} color="#007bff" />
              <MetricCard title="Total Revenue" value={`₱${bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()}`} color="#28a745" />
              <MetricCard title="Total Users" value={users.length} color="#ffc107" />
              <MetricCard title="Total Listings" value={listings.length} color="#dc3545" />
            </div>

            {/* Recent Bookings */}
            <div style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ marginBottom: "16px" }}>Recent Bookings</h3>
              {bookings.slice(0, 10).length === 0 ? (
                <div style={{ color: "#666" }}>No bookings found</div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {bookings.slice(0, 10).map((booking) => (
                    <div key={booking.id} style={{
                      padding: "12px",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{booking.listingTitle || "Unknown Listing"}</div>
                        <div style={{ fontSize: "14px", color: "#666" }}>
                          {booking.startDate} → {booking.endDate}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "bold" }}>₱{booking.totalPrice?.toLocaleString() || "0"}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>{booking.status || "pending"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case "analytics":
        return <Analytics bookings={bookings} listings={listings} users={users} />;
      case "payments":
        return <PaymentReview bookings={bookings} />;
      case "serviceFees":
        return <ServiceFees />;
      case "policy":
        return <PolicyCompliance />;
      case "reports":
        return <Reports bookings={bookings} users={users} listings={listings} />;
      case "users":
        return <UserManagement />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <AdminHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <div style={{
      background: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "32px", fontWeight: "bold", color: color }}>{value}</div>
    </div>
  );
}

