import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, Search, Shield, User, Mail } from "lucide-react";

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
    return <div>Loading users...</div>;
  }

  const stats = {
    total: users.length,
    guests: users.filter(u => (u.role || u.accType || "guest") === "guest").length,
    hosts: users.filter(u => (u.role || u.accType) === "host").length,
    admins: users.filter(u => (u.role || u.accType) === "admin").length,
  };

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "bold" }}>User Management</h2>

      {/* Statistics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <StatCard title="Total Users" value={stats.total} icon={Users} />
        <StatCard title="Guests" value={stats.guests} icon={User} />
        <StatCard title="Hosts" value={stats.hosts} icon={Shield} />
        <StatCard title="Admins" value={stats.admins} icon={Shield} />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: "16px",
        marginBottom: "24px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, minWidth: "300px" }}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px"
          }}
        >
          <option value="all">All Roles</option>
          <option value="guest">Guests</option>
          <option value="host">Hosts</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{
        background: "#fff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>User</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Phone</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Role</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Joined</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const role = user.role || user.accType || "guest";
                const badgeColor = getRoleBadgeColor(role);
                const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);

                return (
                  <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "bold" }}>
                        {user.firstName || ""} {user.lastName || ""}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
                        {user.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Mail size={14} color="#666" />
                        {user.email || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>{user.phoneNumber || "N/A"}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        background: badgeColor.bg,
                        color: badgeColor.color,
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>
                      {joinDate.toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
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
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
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
      <div style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

