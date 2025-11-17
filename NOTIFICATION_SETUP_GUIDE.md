# Booking Notification System - Setup Guide

## Overview
The notification system has been successfully implemented! Guests will now receive notifications (both in-app and via email) when hosts confirm or cancel their bookings.

## ✅ What's Been Implemented

### 1. **In-App Notifications**
- Real-time notification system using Firestore
- Notification bell icon in the header with unread count badge
- Dropdown menu showing all notifications
- Click notifications to navigate to booking details
- Mark individual or all notifications as read

### 2. **Email Notifications**
- Email notifications sent via EmailJS
- Beautiful HTML email templates for:
  - Booking confirmations
  - Booking cancellations (with refund information)

### 3. **Notification Features**
- Automatic notifications when host confirms booking
- Automatic notifications when host cancels booking
- Real-time updates (no page refresh needed)
- Persistent notification history
- Unread notification count badge

---

## 📧 EmailJS Setup Instructions

### Step 1: Create EmailJS Templates

You need to create **2 email templates** in your EmailJS dashboard:

#### Template 1: Booking Confirmation

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to **Email Templates** → **Create New Template**
3. Name it: `Booking Confirmation`
4. Copy the HTML from: `src/utils/emailTemplates/bookingConfirmationTemplate.html`
5. Paste it into the template editor
6. **Save the Template ID** (you'll need this for `.env`)

**Template Variables Required:**
- `{{user_name}}` - Guest's name
- `{{user_email}}` - Guest's email
- `{{to_email}}` - Recipient email
- `{{booking_id}}` - Booking ID
- `{{listing_title}}` - Property/listing name
- `{{booking_dates}}` - Check-in/check-out dates
- `{{total_price}}` - Total booking price (formatted as ₱XX.XX)
- `{{guests}}` - Number of guests
- `{{nights}}` - Number of nights

#### Template 2: Booking Cancellation

1. Create another template: **Booking Cancellation**
2. Copy the HTML from: `src/utils/emailTemplates/bookingCancellationTemplate.html`
3. Paste it into the template editor
4. **Save the Template ID** (you'll need this for `.env`)

**Template Variables Required:**
- `{{user_name}}` - Guest's name
- `{{user_email}}` - Guest's email
- `{{to_email}}` - Recipient email
- `{{booking_id}}` - Booking ID
- `{{listing_title}}` - Property/listing name
- `{{booking_dates}}` - Check-in/check-out dates
- `{{total_price}}` - Total booking price (formatted as ₱XX.XX)
- `{{guests}}` - Number of guests
- `{{nights}}` - Number of nights
- `{{payment_status}}` - Payment status (Paid/Pending)
- `{{refund_info}}` - Refund information message

### Step 2: Update Environment Variables

Add these to your `.env` file:

```env
# Existing EmailJS variables
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_default_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# New booking notification template IDs
VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID=your_confirmation_template_id
VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID=your_cancellation_template_id
```

**Note:** If you don't set the booking-specific template IDs, the system will fall back to using the default `VITE_EMAILJS_TEMPLATE_ID` for both types.

### Step 3: Test the Email Templates

1. Test the confirmation template with sample data
2. Test the cancellation template with sample data
3. Verify all variables are displaying correctly
4. Check email formatting on mobile and desktop

---

## 🔔 How It Works

### When Host Confirms a Booking:

1. **Booking Status Updated** → Firestore booking document updated to "confirmed"
2. **In-App Notification Created** → Notification document added to Firestore
3. **Email Sent** → EmailJS sends confirmation email to guest
4. **Real-Time Update** → Guest sees notification immediately (if online)
5. **Badge Updated** → Unread count badge updates automatically

### When Host Cancels a Booking:

1. **Booking Status Updated** → Firestore booking document updated to "cancelled"
2. **In-App Notification Created** → Notification document added to Firestore
3. **Email Sent** → EmailJS sends cancellation email with refund info
4. **Real-Time Update** → Guest sees notification immediately (if online)
5. **Badge Updated** → Unread count badge updates automatically

---

## 📁 Files Created/Modified

### New Files:
- `src/utils/notificationService.js` - Notification utility functions
- `src/context/NotificationContext.jsx` - Notification state management
- `src/components/ui/NotificationDropdown.jsx` - Notification dropdown UI
- `src/utils/emailTemplates/bookingConfirmationTemplate.html` - Confirmation email template
- `src/utils/emailTemplates/bookingCancellationTemplate.html` - Cancellation email template

### Modified Files:
- `src/components/hostFolder/HostBooking.jsx` - Added notification triggers
- `src/components/UserFolder/Header.jsx` - Added notification bell icon
- `src/utils/emailService.js` - Added booking email functions
- `src/components/cssFile/temp.css` - Added notification styles
- `src/main.jsx` - Added NotificationProvider

---

## 🎨 UI Features

### Notification Bell Icon
- Located in the header (next to chat icon)
- Shows unread count badge (up to 99+)
- Only visible when user is logged in
- Click to open/close dropdown

### Notification Dropdown
- Shows up to 50 most recent notifications
- Unread notifications highlighted with colored border
- Click notification to navigate to bookings page
- "Mark all read" button for convenience
- "View all bookings" button at bottom
- Empty state when no notifications
- Responsive design for mobile

### Notification Items
- Icon indicating type (✓ for confirmed, ✕ for cancelled)
- Title and message
- Property name and booking dates
- Relative time (e.g., "2h ago", "Just now")
- Visual distinction for unread items

---

## 🔧 Firestore Structure

### Notifications Collection

```javascript
{
  userId: string,              // Guest user ID
  type: string,                 // "booking_confirmed" | "booking_cancelled"
  bookingId: string,            // Booking document ID
  title: string,                // Notification title
  message: string,              // Notification message
  listingTitle: string,         // Property name
  bookingDates: string,         // Formatted dates
  read: boolean,                // Read status
  createdAt: Timestamp,         // Creation timestamp
  readAt: Timestamp (optional)  // When marked as read
}
```

### Firestore Indexes Required

The system uses these queries:
- `notifications` collection: Query by `userId` and `createdAt` (descending)
- `notifications` collection: Query by `userId` and `read` (for unread count)

Firestore will automatically create these indexes, but you may see a console warning on first use. Click the link in the warning to create the index.

---

## 🚀 Testing Checklist

- [ ] Host confirms a booking → Guest receives notification
- [ ] Host cancels a booking → Guest receives notification
- [ ] Notification badge shows correct unread count
- [ ] Clicking notification navigates to bookings page
- [ ] Mark as read functionality works
- [ ] Mark all as read functionality works
- [ ] Email confirmation template displays correctly
- [ ] Email cancellation template displays correctly
- [ ] Refund information shows in cancellation emails
- [ ] Real-time updates work (open in two browsers)
- [ ] Mobile responsive design works

---

## 🐛 Troubleshooting

### Notifications Not Appearing
- Check if user is logged in
- Verify Firestore rules allow read/write to `notifications` collection
- Check browser console for errors
- Verify NotificationProvider is wrapped in main.jsx

### Email Not Sending
- Verify EmailJS credentials in `.env`
- Check EmailJS dashboard for send logs
- Verify template IDs are correct
- Check template variables match exactly (case-sensitive)

### Badge Count Not Updating
- Check Firestore listener is active
- Verify user authentication state
- Check browser console for errors
- Refresh page to reset context

---

## 📝 Notes

- Notifications are persistent (stored in Firestore)
- All notifications are kept (no auto-deletion)
- Email notifications are sent for every action (as requested)
- Refund information is included in cancellation emails
- System gracefully handles email failures (won't break booking flow)
- Real-time updates work automatically via Firestore listeners

---

## 🎉 You're All Set!

The notification system is fully implemented and ready to use. Just set up your EmailJS templates and you're good to go!

For questions or issues, check the browser console for error messages and verify your Firestore rules allow the necessary operations.

