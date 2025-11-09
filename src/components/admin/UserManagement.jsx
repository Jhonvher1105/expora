import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, Search, Shield, User, Mail } from "lucide-react";
import "./AdminDashboard.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (filterRole !== "all") {
      filtered = filtered.filter(u => {
        const role = u.role || u.accType || "guest";
        return role === filterRole;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phoneNumber?.includes(searchQuery)
      );
    }

    setFilteredUsers(filtered);
  }, [users, filterRole, searchQuery]);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole,
        accType: newRole,
        updatedAt: new Date()
      });
      await loadUsers();
      alert("User role updated successfully!");
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return { bg: "#dc3545", color: "#fff" };
      case "host":
        return { bg: "#007bff", color: "#fff" };
      default:
        return { bg: "#6c757d", color: "#fff" };
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <div>Loading users...</div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    guests: users.filter(u => (u.role || u.accType || "guest") === "guest").length,
    hosts: users.filter(u => (u.role || u.accType) === "host").length,
    admins: users.filter(u => (u.role || u.accType) === "admin").length,
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h2>User Management</h2>
      </div>

      {/* Statistics */}
      <div className="admin-metrics-grid">
        <MetricCard title="Total Users" value={stats.total} color="#ff6b35" icon="👥" />
        <MetricCard title="Guests" value={stats.guests} color="#8b5cf6" icon="👤" />
        <MetricCard title="Hosts" value={stats.hosts} color="#10b981" icon="🏠" />
        <MetricCard title="Admins" value={stats.admins} color="#ef4444" icon="🛡️" />
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-container">
          <Search className="admin-search-icon" size={20} />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="guest">Guests</option>
          <option value="host">Hosts</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table - Desktop */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-empty-state">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const role = user.role || user.accType || "guest";
                const badgeColor = getRoleBadgeColor(role);
                const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: "600" }}>
                        {user.firstName || ""} {user.lastName || ""}
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
                        {user.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={14} color="rgba(255, 255, 255, 0.6)" />
                        {user.email || "N/A"}
                      </div>
                    </td>
                    <td>{user.phoneNumber || "N/A"}</td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: badgeColor.bg,
                        color: badgeColor.color,
                        fontSize: "11px",
                        fontWeight: "600"
                      }}>
                        {role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)" }}>
                      {joinDate.toLocaleDateString()}
                    </td>
                    <td>
                      <select
                        className="admin-filter-select"
                        value={role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{ fontSize: "13px", padding: "6px 8px", minWidth: "100px" }}
                      >
                        <option value="guest">Guest</option>
                        <option value="host">Host</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Users Cards - Mobile */}
      <div className="admin-card-list">
        {filteredUsers.length === 0 ? (
          <div className="admin-empty-state">No users found</div>
        ) : (
          filteredUsers.map((user) => {
            const role = user.role || user.accType || "guest";
            const badgeColor = getRoleBadgeColor(role);
            const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);

            return (
              <div key={user.id} className="admin-card-item">
                <div className="admin-card-item-header">
                  <div>
                    <div className="admin-card-item-value" style={{ fontSize: "16px", fontWeight: "600" }}>
                      {user.firstName || ""} {user.lastName || ""}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace", marginTop: "4px" }}>
                      {user.id.substring(0, 8)}...
                    </div>
                  </div>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: badgeColor.bg,
                    color: badgeColor.color,
                    fontSize: "11px",
                    fontWeight: "600"
                  }}>
                    {role.toUpperCase()}
                  </span>
                </div>
                <div className="admin-card-item-body">
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Email</span>
                    <span className="admin-card-item-value" style={{ fontSize: "13px" }}>
                      {user.email || "N/A"}
                    </span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Phone</span>
                    <span className="admin-card-item-value">{user.phoneNumber || "N/A"}</span>
                  </div>
                  <div className="admin-card-item-row">
                    <span className="admin-card-item-label">Joined</span>
                    <span className="admin-card-item-value">{joinDate.toLocaleDateString()}</span>
                  </div>
                  <div className="admin-card-item-actions">
                    <select
                      className="admin-filter-select"
                      value={role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <option value="guest">Guest</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
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

