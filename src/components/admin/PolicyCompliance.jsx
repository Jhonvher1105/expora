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
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>Policy & Compliance</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #ddd" }}>
        <button
          onClick={() => setActiveTab("policies")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: activeTab === "policies" ? "#007bff" : "transparent",
            color: activeTab === "policies" ? "#fff" : "#333",
            cursor: "pointer",
            borderBottom: activeTab === "policies" ? "2px solid #007bff" : "none",
            marginBottom: "-2px"
          }}
        >
          Policies
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: activeTab === "reports" ? "#007bff" : "transparent",
            color: activeTab === "reports" ? "#fff" : "#333",
            cursor: "pointer",
            borderBottom: activeTab === "reports" ? "2px solid #007bff" : "none",
            marginBottom: "-2px"
          }}
        >
          Reports ({reports.length})
        </button>
      </div>

      {activeTab === "policies" && (
        <div>
          {/* Add/Edit Policy Form */}
          <div style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "8px",
            marginBottom: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "16px" }}>
              {editingPolicy ? "Edit Policy" : "Add New Policy"}
            </h3>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Title</label>
                <input
                  type="text"
                  value={newPolicy.title}
                  onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                  placeholder="Policy title"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Type</label>
                <select
                  value={newPolicy.type}
                  onChange={(e) => setNewPolicy({ ...newPolicy, type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px"
                  }}
                >
                  <option value="terms">Terms of Service</option>
                  <option value="privacy">Privacy Policy</option>
                  <option value="rules">Community Rules</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Content</label>
                <textarea
                  value={newPolicy.content}
                  onChange={(e) => setNewPolicy({ ...newPolicy, content: e.target.value })}
                  placeholder="Policy content..."
                  rows={10}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontFamily: "inherit"
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSavePolicy}
                  style={{
                    padding: "10px 20px",
                    background: "#007bff",
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
                    style={{
                      padding: "10px 20px",
                      background: "#6c757d",
                      color: "#fff",
                      border: "none",
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
                style={{
                  background: "#fff",
                  padding: "20px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>{policy.title}</h4>
                    <span style={{
                      padding: "4px 8px",
                      background: "#e7f3ff",
                      color: "#007bff",
                      borderRadius: "4px",
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "inline-block"
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
                      style={{
                        padding: "6px 12px",
                        background: "#007bff",
                        color: "#fff",
                        border: "none",
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
                      style={{
                        padding: "6px 12px",
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
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
                <div style={{ color: "#666", whiteSpace: "pre-wrap" }}>{policy.content}</div>
              </div>
            ))}
            {policies.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No policies found. Add your first policy above.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div>
          <div style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "16px" }}>User Reports</h3>
            {reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No reports found.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {reports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: "16px",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      border: "1px solid #ddd"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ fontWeight: "bold" }}>{report.type || "General Report"}</div>
                      <span style={{
                        padding: "4px 8px",
                        background: report.status === "resolved" ? "#d4edda" : "#fff3cd",
                        color: report.status === "resolved" ? "#155724" : "#856404",
                        borderRadius: "4px",
                        fontSize: "12px"
                      }}>
                        {report.status || "pending"}
                      </span>
                    </div>
                    <div style={{ color: "#666", marginBottom: "8px" }}>{report.description || "No description"}</div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
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

