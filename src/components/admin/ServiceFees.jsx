import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { DollarSign, Save, Edit } from "lucide-react";
import "./AdminDashboard.css";

export default function ServiceFees() {
  const [serviceFee, setServiceFee] = useState({ type: "percentage", value: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadServiceFee = async () => {
      try {
        const feeRef = doc(db, "settings", "serviceFee");
        const feeSnap = await getDoc(feeRef);
        if (feeSnap.exists()) {
          setServiceFee(feeSnap.data());
        } else {
          // Initialize with default
          await setDoc(feeRef, {
            type: "percentage",
            value: 10,
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error loading service fee:", error);
      } finally {
        setLoading(false);
      }
    };
    loadServiceFee();
  }, []);

  const handleSave = async () => {
    if (serviceFee.value <= 0) {
      setMessage("Service fee must be greater than 0");
      return;
    }
    if (serviceFee.type === "percentage" && serviceFee.value > 100) {
      setMessage("Percentage cannot exceed 100%");
      return;
    }

    try {
      setSaving(true);
      const feeRef = doc(db, "settings", "serviceFee");
      await setDoc(feeRef, {
        ...serviceFee,
        value: Number(serviceFee.value),
        updatedAt: serverTimestamp()
      });
      setMessage("Service fee updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving service fee:", error);
      setMessage("Failed to save service fee");
    } finally {
      setSaving(false);
    }
  };

  const calculateExample = (amount) => {
    if (serviceFee.type === "percentage") {
      return (amount * serviceFee.value / 100).toFixed(2);
    } else {
      return serviceFee.value.toFixed(2);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading service fees...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h2>Service Fees Management</h2>
      </div>

      <div className="admin-card" style={{ maxWidth: "600px" }}>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>
            Fee Type
          </label>
          <div style={{ display: "flex", gap: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#ffffff" }}>
              <input
                type="radio"
                name="feeType"
                value="percentage"
                checked={serviceFee.type === "percentage"}
                onChange={(e) => setServiceFee({ ...serviceFee, type: e.target.value })}
                style={{ accentColor: "#ff6b35" }}
              />
              Percentage (%)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#ffffff" }}>
              <input
                type="radio"
                name="feeType"
                value="fixed"
                checked={serviceFee.type === "fixed"}
                onChange={(e) => setServiceFee({ ...serviceFee, type: e.target.value })}
                style={{ accentColor: "#ff6b35" }}
              />
              Fixed Amount (₱)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>
            Fee Value
          </label>
          <input
            type="number"
            value={serviceFee.value}
            onChange={(e) => setServiceFee({ ...serviceFee, value: e.target.value })}
            min="0"
            step={serviceFee.type === "percentage" ? "0.1" : "1"}
            className="admin-form-input"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              fontSize: "16px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff"
            }}
          />
          {serviceFee.type === "percentage" && (
            <div style={{ marginTop: "4px", color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>
              This will charge {serviceFee.value}% of the booking total
            </div>
          )}
        </div>

        {/* Example Calculation */}
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          padding: "16px",
          borderRadius: "4px",
          marginBottom: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#ffffff" }}>Example Calculation:</div>
          <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
            Booking Amount: ₱1,000.00
          </div>
          <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
            Service Fee ({serviceFee.type === "percentage" ? `${serviceFee.value}%` : `₱${serviceFee.value}`}): ₱{calculateExample(1000)}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", color: "#ff6b35" }}>
            Host Receives: ₱{(1000 - parseFloat(calculateExample(1000))).toFixed(2)}
          </div>
        </div>

        {message && (
          <div style={{
            padding: "12px",
            background: message.includes("success") ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            color: message.includes("success") ? "#10b981" : "#ef4444",
            borderRadius: "4px",
            marginBottom: "16px",
            border: `1px solid ${message.includes("success") ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-btn admin-btn-primary"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            opacity: saving ? 0.6 : 1
          }}
        >
          <Save size={20} />
          {saving ? "Saving..." : "Save Service Fee"}
        </button>
      </div>

      {/* Current Fee Info */}
      <div style={{
        marginTop: "24px",
        padding: "16px",
        background: "rgba(255, 107, 53, 0.1)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 107, 53, 0.3)"
      }}>
        <h3 style={{ marginBottom: "12px", fontSize: "18px", color: "#ffffff" }}>Current Service Fee</h3>
        <div style={{ fontSize: "16px", color: "#ffffff" }}>
          <strong>Type:</strong> {serviceFee.type === "percentage" ? "Percentage" : "Fixed Amount"}
        </div>
        <div style={{ fontSize: "16px", color: "#ffffff" }}>
          <strong>Value:</strong> {serviceFee.type === "percentage" ? `${serviceFee.value}%` : `₱${serviceFee.value}`}
        </div>
        {serviceFee.updatedAt && (
          <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)", marginTop: "8px" }}>
            Last updated: {serviceFee.updatedAt.toDate ? serviceFee.updatedAt.toDate().toLocaleString() : "N/A"}
          </div>
        )}
      </div>
    </div>
  );
}

