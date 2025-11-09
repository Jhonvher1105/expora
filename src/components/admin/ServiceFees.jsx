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
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Fee Type
          </label>
          <div style={{ display: "flex", gap: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="feeType"
                value="percentage"
                checked={serviceFee.type === "percentage"}
                onChange={(e) => setServiceFee({ ...serviceFee, type: e.target.value })}
              />
              Percentage (%)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="feeType"
                value="fixed"
                checked={serviceFee.type === "fixed"}
                onChange={(e) => setServiceFee({ ...serviceFee, type: e.target.value })}
              />
              Fixed Amount (₱)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Fee Value
          </label>
          <input
            type="number"
            value={serviceFee.value}
            onChange={(e) => setServiceFee({ ...serviceFee, value: e.target.value })}
            min="0"
            step={serviceFee.type === "percentage" ? "0.1" : "1"}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px"
            }}
          />
          {serviceFee.type === "percentage" && (
            <div style={{ marginTop: "4px", color: "#666", fontSize: "14px" }}>
              This will charge {serviceFee.value}% of the booking total
            </div>
          )}
        </div>

        {/* Example Calculation */}
        <div style={{
          background: "#f8f9fa",
          padding: "16px",
          borderRadius: "4px",
          marginBottom: "24px"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Example Calculation:</div>
          <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
            Booking Amount: ₱1,000.00
          </div>
          <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
            Service Fee ({serviceFee.type === "percentage" ? `${serviceFee.value}%` : `₱${serviceFee.value}`}): ₱{calculateExample(1000)}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #ddd" }}>
            Host Receives: ₱{(1000 - parseFloat(calculateExample(1000))).toFixed(2)}
          </div>
        </div>

        {message && (
          <div style={{
            padding: "12px",
            background: message.includes("success") ? "#d4edda" : "#f8d7da",
            color: message.includes("success") ? "#155724" : "#721c24",
            borderRadius: "4px",
            marginBottom: "16px"
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 24px",
            background: "#007bff",
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
        background: "#e7f3ff",
        borderRadius: "8px",
        border: "1px solid #b3d9ff"
      }}>
        <h3 style={{ marginBottom: "12px", fontSize: "18px" }}>Current Service Fee</h3>
        <div style={{ fontSize: "16px" }}>
          <strong>Type:</strong> {serviceFee.type === "percentage" ? "Percentage" : "Fixed Amount"}
        </div>
        <div style={{ fontSize: "16px" }}>
          <strong>Value:</strong> {serviceFee.type === "percentage" ? `${serviceFee.value}%` : `₱${serviceFee.value}`}
        </div>
        {serviceFee.updatedAt && (
          <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            Last updated: {serviceFee.updatedAt.toDate ? serviceFee.updatedAt.toDate().toLocaleString() : "N/A"}
          </div>
        )}
      </div>
    </div>
  );
}

