import { db } from "../firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { reload } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Generate a secure random verification token
 * @returns {string} - A random token string
 */
export const generateVerificationToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store verification token in Firestore
 * @param {string} uid - User ID
 * @param {string} token - Verification token
 * @param {string} email - User's email
 * @returns {Promise} - Promise that resolves when token is stored
 */
export const storeVerificationToken = async (uid, token, email) => {
  try {
    const tokenDoc = {
      uid,
      email,
      token,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      used: false,
    };

    await setDoc(doc(db, "verificationTokens", token), tokenDoc);
    return { success: true };
  } catch (error) {
    console.error("Error storing verification token:", error);
    throw new Error("Failed to generate verification token");
  }
};

/**
 * Verify a verification token
 * @param {string} token - Verification token to verify
 * @returns {Promise<Object>} - Token data if valid, null if invalid
 */
export const verifyToken = async (token) => {
  try {
    const tokenDoc = await getDoc(doc(db, "verificationTokens", token));
    
    if (!tokenDoc.exists()) {
      return { error: "Token not found" };
    }

    const tokenData = tokenDoc.data();

    // Check if token has been used
    if (tokenData.used) {
      return { error: "Token already used" };
    }

    // Check if token has expired
    const expiresAt = tokenData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return { error: "Token has expired" };
    }

    return {
      uid: tokenData.uid,
      email: tokenData.email,
      token: token,
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return { error: "Failed to verify token" };
  }
};

/**
 * Mark a token as used
 * @param {string} token - Token to mark as used
 * @returns {Promise} - Promise that resolves when token is marked as used
 */
export const markTokenAsUsed = async (token) => {
  try {
    await setDoc(
      doc(db, "verificationTokens", token),
      { used: true, usedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error("Error marking token as used:", error);
    throw error;
  }
};

/**
 * Mark email as verified in Firestore user document
 * @param {string} uid - User ID
 * @returns {Promise} - Promise that resolves when email is marked as verified
 */
export const markEmailAsVerified = async (uid) => {
  try {
    await setDoc(
      doc(db, "users", uid),
      { emailVerified: true, emailVerifiedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error("Error marking email as verified:", error);
    throw error;
  }
};

/**
 * Check if user's email is verified (from Firestore)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} - True if email is verified
 */
export const isEmailVerified = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.emailVerified === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};

/**
 * Delete a verification token (cleanup)
 * @param {string} token - Token to delete
 * @returns {Promise} - Promise that resolves when token is deleted
 */
export const deleteToken = async (token) => {
  try {
    await deleteDoc(doc(db, "verificationTokens", token));
  } catch (error) {
    console.error("Error deleting token:", error);
    // Don't throw - cleanup is not critical
  }
};

