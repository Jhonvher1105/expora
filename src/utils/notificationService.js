import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Create a notification in Firestore
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.userId - User ID to notify
 * @param {string} notificationData.type - Notification type ('booking_confirmed' | 'booking_cancelled' | 'new_booking')
 * @param {string} notificationData.bookingId - Booking ID
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.listingTitle - Property/listing title
 * @param {string} notificationData.bookingDates - Formatted booking dates
 * @returns {Promise<string>} - Notification document ID
 */
export const createNotification = async (notificationData) => {
  try {
    const notificationRef = await addDoc(collection(db, "notifications"), {
      userId: notificationData.userId,
      type: notificationData.type,
      bookingId: notificationData.bookingId,
      title: notificationData.title,
      message: notificationData.message,
      listingTitle: notificationData.listingTitle || "",
      bookingDates: notificationData.bookingDates || "",
      read: false,
      createdAt: serverTimestamp(),
    });
    
    console.log("Notification created:", notificationRef.id);
    return notificationRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of results (default: 50)
 * @returns {Promise<Array>} - Array of notification documents
 */
export const getUserNotifications = async (userId, maxResults = 50) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Get unread notifications count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of unread notifications
 */
export const getUnreadCount = async (userId) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export const markAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const markAllAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/**
 * Format booking dates for display
 * @param {Date|Timestamp|string} startDate - Start date
 * @param {Date|Timestamp|string} endDate - End date
 * @returns {string} - Formatted date string
 */
export const formatBookingDates = (startDate, endDate) => {
  try {
    const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
    const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
    
    const startFormatted = start.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    
    const endFormatted = end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error("Error formatting dates:", error);
    return "N/A";
  }
};

