import React, { useEffect, useRef } from "react";
import { Bell, CheckCircle, XCircle, X, Calendar, MapPin } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import "../cssFile/temp.css";

function NotificationDropdown({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "Just now";
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      return "Recently";
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to appropriate page based on notification type
    if (notification.type === "new_booking") {
      // For hosts, navigate to host bookings page
      navigate("/HostBooking");
    } else {
      // For guests, navigate to guest bookings page
      navigate("/MyBooking");
    }
    onClose();
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking_confirmed":
        return <CheckCircle size={18} style={{ color: "#10b981" }} />;
      case "booking_cancelled":
        return <XCircle size={18} style={{ color: "#ef4444" }} />;
      case "new_booking":
        return <Bell size={18} style={{ color: "#3b82f6" }} />;
      default:
        return <Bell size={18} />;
    }
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case "booking_confirmed":
        return "#10b981";
      case "booking_cancelled":
        return "#ef4444";
      case "new_booking":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  if (!isOpen) return null;

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-dropdown-header">
        <div className="notification-dropdown-title">
          <Bell size={20} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="notification-unread-badge">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="notification-mark-all-read"
            onClick={handleMarkAllAsRead}
            title="Mark all as read"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-dropdown-content">
        {notifications.length === 0 ? (
          <div className="notification-empty-state">
            <Bell size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
            <p>No notifications yet</p>
            <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
              You'll see notifications here about your bookings.
            </p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? "notification-unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title-row">
                    <h4 className="notification-title">{notification.title}</h4>
                    {!notification.read && (
                      <span
                        className="notification-dot"
                        style={{ backgroundColor: getNotificationColor(notification.type) }}
                      />
                    )}
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  {notification.listingTitle && (
                    <div className="notification-meta">
                      <MapPin size={12} />
                      <span>{notification.listingTitle}</span>
                    </div>
                  )}
                  {notification.bookingDates && (
                    <div className="notification-meta">
                      <Calendar size={12} />
                      <span>{notification.bookingDates}</span>
                    </div>
                  )}
                  <div className="notification-time">
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-dropdown-footer">
          <button
            className="notification-view-all"
            onClick={() => {
              navigate("/MyBooking");
              onClose();
            }}
          >
            View all bookings
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;

