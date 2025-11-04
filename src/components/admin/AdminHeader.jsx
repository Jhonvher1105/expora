import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { BarChart3, CreditCard, DollarSign, Settings, FileText, Users, Home, LogOut } from "lucide-react";
import { auth } from "../../firebase";
import "../cssFile/temp.css";

export default function AdminHeader({ activeTab, setActiveTab }) {
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
    { id: "serviceFees", label: "Service Fees", icon: DollarSign },
    { id: "policy", label: "Policy & Compliance", icon: FileText },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <header style={{
      background: "#fff",
      borderBottom: "1px solid #e0e0e0",
      padding: "16px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#333" }}>Admin Panel</h1>
        <nav style={{ display: "flex", gap: 8 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: activeTab === item.id ? "#007bff" : "transparent",
                  color: activeTab === item.id ? "#fff" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s"
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: "8px 16px",
          border: "1px solid #ddd",
          background: "#fff",
          color: "#333",
          borderRadius: "4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </header>
  );
}

