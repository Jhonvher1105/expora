import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

/**
 * Check if current user is admin
 */
export async function checkAdminRole(userId) {
  if (!userId) return false;
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role === "admin" || userData.accType === "admin";
    }
    return false;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

/**
 * Hook to get current user's admin status
 */
export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminStatus = await checkAdminRole(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { isAdmin, loading };
}

