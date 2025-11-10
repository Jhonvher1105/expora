import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import AdminHeader from "./AdminHeader";
import Analytics from "./Analytics";
import PaymentReview from "./PaymentReview";
import PayoutRequests from "./PayoutRequests";
import ServiceFees from "./ServiceFees";
import PolicyCompliance from "./PolicyCompliance";
import Reports from "./Reports";
import UserManagement from "./UserManagement";
import "../cssFile/temp.css";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.admin-sidebar');
        const toggle = document.querySelector('.admin-menu-toggle');
        if (sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

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
        <div className="admin-loading-container">
          <div className="admin-loading-spinner"></div>
          <div>Loading dashboard...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="admin-content">
            <h2 className="admin-page-title">Dashboard Overview</h2>
            
            {/* Key Metrics */}
            <div className="admin-metrics-grid">
              <MetricCard 
                title="Total Bookings" 
                value={bookings.length} 
                color="#ff6b35"
                icon="📅"
              />
              <MetricCard 
                title="Total Revenue" 
                value={`₱${bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toLocaleString()}`} 
                color="#10b981"
                icon="💰"
              />
              <MetricCard 
                title="Total Users" 
                value={users.length} 
                color="#8b5cf6"
                icon="👥"
              />
              <MetricCard 
                title="Total Listings" 
                value={listings.length} 
                color="#f59e0b"
                icon="🏠"
              />
            </div>

            {/* Recent Bookings */}
            <div className="admin-card">
              <h3 className="admin-card-title">Recent Bookings</h3>
              {bookings.slice(0, 10).length === 0 ? (
                <div className="admin-empty-state">No bookings found</div>
              ) : (
                <div className="admin-bookings-list">
                  {bookings.slice(0, 10).map((booking) => (
                    <div key={booking.id} className="admin-booking-item">
                      <div className="admin-booking-info">
                        <div className="admin-booking-title">{booking.listingTitle || "Unknown Listing"}</div>
                        <div className="admin-booking-dates">
                          {booking.startDate} → {booking.endDate}
                        </div>
                      </div>
                      <div className="admin-booking-details">
                        <div className="admin-booking-price">₱{booking.totalPrice?.toLocaleString() || "0"}</div>
                        <div className={`admin-status-badge admin-status-${booking.status || "pending"}`}>
                          {booking.status || "pending"}
                        </div>
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
      case "payouts":
        return <PayoutRequests />;
      case "serviceFees":
        return <ServiceFees />;
      case "policy":
        return <PolicyCompliance />;
      case "reports":
        return <Reports bookings={bookings} users={users} listings={listings} />;
      case "users":
        return <UserManagement />;
      default:
        return <div className="admin-content">Page not found</div>;
    }
  };

  return (
    <div className="admin-dashboard-container">
      <AdminHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className="admin-main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function MetricCard({ title, value, color, icon }) {
  return (
    <div className="admin-metric-card" style={{ borderLeftColor: color }}>
      <div className="admin-metric-header">
        <span className="admin-metric-icon">{icon}</span>
        <span className="admin-metric-title">{title}</span>
      </div>
      <div className="admin-metric-value" style={{ color: color }}>{value}</div>
    </div>
  );
}

