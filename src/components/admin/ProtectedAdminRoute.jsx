import { Navigate } from "react-router-dom";
import { useAdminStatus } from "../../utils/adminUtils";
import { auth } from "../../firebase";

export default function ProtectedAdminRoute({ children }) {
  const { isAdmin, loading } = useAdminStatus();
  const currentUser = auth.currentUser;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/LogIn" replace />;
  }

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
        <h2>Access Denied</h2>
        <p>You must be an administrator to access this page.</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return children;
}

