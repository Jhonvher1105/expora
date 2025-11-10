import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { 
  BarChart3, CreditCard, DollarSign, Settings, FileText, Users, Home, 
  LogOut, Menu, X, Shield, Wallet
} from "lucide-react";
import { auth } from "../../firebase";
import "../cssFile/temp.css";
import "./AdminDashboard.css";

export default function AdminHeader({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/LogIn");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "payouts", label: "Payout Requests", icon: Wallet },
    { id: "serviceFees", label: "Service Fees", icon: Settings },
    { id: "policy", label: "Policy & Compliance", icon: FileText },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "users", label: "Users", icon: Users },
  ];

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Header Bar */}
      <header className="admin-top-header">
        <div className="admin-header-left">
          <button 
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="admin-logo">
            <Shield size={28} />
            <h1 className="admin-logo-text">Admin Panel</h1>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="admin-logout-btn"
        >
          <LogOut size={18} />
          <span className="admin-logout-text">Logout</span>
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar-open" : ""}`}>
        <nav className="admin-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`admin-nav-item ${isActive ? "admin-nav-item-active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
