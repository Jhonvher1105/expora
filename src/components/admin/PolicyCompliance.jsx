import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { FileText, Save, Plus, Trash2 } from "lucide-react";

export default function PolicyCompliance() {
  const [policies, setPolicies] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("policies");
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [newPolicy, setNewPolicy] = useState({ title: "", content: "", type: "terms" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load policies
      const policiesRef = collection(db, "policies");
      const policiesSnap = await getDocs(policiesRef);
      const policiesData = policiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPolicies(policiesData);

      // Load reports
      const reportsRef = collection(db, "reports");
      const reportsSnap = await getDocs(reportsRef);
      const reportsData = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!newPolicy.title || !newPolicy.content) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const policyRef = editingPolicy
        ? doc(db, "policies", editingPolicy.id)
        : doc(collection(db, "policies"));

      await setDoc(policyRef, {
        ...newPolicy,
        updatedAt: serverTimestamp(),
        createdAt: editingPolicy ? editingPolicy.createdAt : serverTimestamp()
      });

      await loadData();
      setNewPolicy({ title: "", content: "", type: "terms" });
      setEditingPolicy(null);
      alert("Policy saved successfully!");
    } catch (error) {
      console.error("Error saving policy:", error);
      alert("Failed to save policy");
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;

    try {
      const policyRef = doc(db, "policies", policyId);
      await deleteDoc(policyRef);
      await loadData();
      alert("Policy deleted successfully!");
    } catch (error) {
      console.error("Error deleting policy:", error);
      alert("Failed to delete policy");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-content" style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold", color: "#ffffff" }}>Policy & Compliance</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid rgba(255, 255, 255, 0.1)" }}>
        <button
          onClick={() => setActiveTab("policies")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: activeTab === "policies" ? "rgba(255, 107, 53, 0.2)" : "transparent",
            color: activeTab === "policies" ? "#ff6b35" : "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            borderBottom: activeTab === "policies" ? "2px solid #ff6b35" : "none",
            marginBottom: "-2px",
            transition: "all 0.2s"
          }}
        >
          Policies
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: activeTab === "reports" ? "rgba(255, 107, 53, 0.2)" : "transparent",
            color: activeTab === "reports" ? "#ff6b35" : "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            borderBottom: activeTab === "reports" ? "2px solid #ff6b35" : "none",
            marginBottom: "-2px",
            transition: "all 0.2s"
          }}
        >
          Reports ({reports.length})
        </button>
      </div>

      {activeTab === "policies" && (
        <div>
          {/* Add/Edit Policy Form */}
          <div className="admin-card" style={{
            padding: "24px",
            borderRadius: "8px",
            marginBottom: "24px"
          }}>
            <h3 style={{ marginBottom: "16px", color: "#ffffff" }}>
              {editingPolicy ? "Edit Policy" : "Add New Policy"}
            </h3>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>Title</label>
                <input
                  type="text"
                  value={newPolicy.title}
                  onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                  placeholder="Policy title"
                  className="admin-form-input"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>Type</label>
                <select
                  value={newPolicy.type}
                  onChange={(e) => setNewPolicy({ ...newPolicy, type: e.target.value })}
                  className="admin-form-select"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff"
                  }}
                >
                  <option value="terms" style={{ background: "#1a1a2e", color: "#ffffff" }}>Terms of Service</option>
                  <option value="privacy" style={{ background: "#1a1a2e", color: "#ffffff" }}>Privacy Policy</option>
                  <option value="rules" style={{ background: "#1a1a2e", color: "#ffffff" }}>Community Rules</option>
                  <option value="other" style={{ background: "#1a1a2e", color: "#ffffff" }}>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#ffffff" }}>Content</label>
                <textarea
                  value={newPolicy.content}
                  onChange={(e) => setNewPolicy({ ...newPolicy, content: e.target.value })}
                  placeholder="Policy content..."
                  rows={10}
                  className="admin-form-textarea"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    fontFamily: "inherit",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSavePolicy}
                  className="admin-btn admin-btn-primary"
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <Save size={16} />
                  {editingPolicy ? "Update" : "Save"} Policy
                </button>
                {editingPolicy && (
                  <button
                    onClick={() => {
                      setEditingPolicy(null);
                      setNewPolicy({ title: "", content: "", type: "terms" });
                    }}
                    className="admin-btn admin-btn-secondary"
                    style={{
                      padding: "10px 20px",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Policies List */}
          <div style={{ display: "grid", gap: "16px" }}>
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="admin-card"
                style={{
                  padding: "20px",
                  borderRadius: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#ffffff" }}>{policy.title}</h4>
                    <span style={{
                      padding: "4px 8px",
                      background: "rgba(255, 107, 53, 0.2)",
                      color: "#ff6b35",
                      borderRadius: "4px",
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "inline-block",
                      border: "1px solid rgba(255, 107, 53, 0.3)"
                    }}>
                      {policy.type}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setEditingPolicy(policy);
                        setNewPolicy({ title: policy.title, content: policy.content, type: policy.type });
                      }}
                      className="admin-btn admin-btn-primary"
                      style={{
                        padding: "6px 12px",
                        background: "rgba(255, 107, 53, 0.2)",
                        color: "#ff6b35",
                        border: "1px solid rgba(255, 107, 53, 0.3)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <FileText size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(policy.id)}
                      className="admin-btn admin-btn-danger"
                      style={{
                        padding: "6px 12px",
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ color: "rgba(255, 255, 255, 0.7)", whiteSpace: "pre-wrap" }}>{policy.content}</div>
              </div>
            ))}
            {policies.length === 0 && (
              <div className="admin-empty-state" style={{ textAlign: "center", padding: "40px", color: "rgba(255, 255, 255, 0.6)" }}>
                No policies found. Add your first policy above.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div>
          <div className="admin-card" style={{
            padding: "24px",
            borderRadius: "8px"
          }}>
            <h3 style={{ marginBottom: "16px", color: "#ffffff" }}>User Reports</h3>
            {reports.length === 0 ? (
              <div className="admin-empty-state" style={{ textAlign: "center", padding: "40px", color: "rgba(255, 255, 255, 0.6)" }}>
                No reports found.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {reports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: "16px",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ fontWeight: "bold", color: "#ffffff" }}>{report.type || "General Report"}</div>
                      <span style={{
                        padding: "4px 8px",
                        background: report.status === "resolved" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: report.status === "resolved" ? "#10b981" : "#f59e0b",
                        borderRadius: "4px",
                        fontSize: "12px",
                        border: `1px solid ${report.status === "resolved" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                      }}>
                        {report.status || "pending"}
                      </span>
                    </div>
                    <div style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>{report.description || "No description"}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                      Reported by: {report.reportedBy || "Unknown"} • {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

