# Admin Dashboard Setup Guide

## Overview

The Admin Dashboard has been successfully implemented with the following features:

- ✅ Dashboard Analytics
- ✅ Payment Review & Confirmation
- ✅ Service Fees Management
- ✅ Policy & Compliance Management
- ✅ Report Generation (PDF/CSV)
- ✅ User Management

## Accessing the Admin Dashboard

1. **Set Admin Role**: To access the admin dashboard, a user must have `role: "admin"` or `accType: "admin"` in their Firestore user document.

2. **Navigate to Admin Panel**: 
   - URL: `http://localhost:5173/Admin`
   - Or navigate to `/Admin` route

3. **Admin Authentication**: 
   - The dashboard is protected by `ProtectedAdminRoute`
   - Non-admin users will see "Access Denied"
   - Non-authenticated users will be redirected to login

## Setting Up an Admin User

### Method 1: Via Firestore Console

1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection
3. Find the user document by their UID
4. Add/update fields:
   ```json
   {
     "role": "admin",
     "accType": "admin"
   }
   ```

### Method 2: Via Code (One-time setup)

Create a temporary script or use browser console:

```javascript
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

// After logging in, run this:
const currentUser = auth.currentUser;
if (currentUser) {
  await setDoc(doc(db, "users", currentUser.uid), {
    role: "admin",
    accType: "admin"
  }, { merge: true });
}
```

## Admin Dashboard Features

### 1. Dashboard Overview
- Key metrics (Total Bookings, Revenue, Users, Listings)
- Recent bookings list
- Quick statistics

### 2. Analytics
- Booking status breakdown
- Best and lowest reviewed listings
- Monthly revenue trends
- Comprehensive statistics

### 3. Payment Review
- View all transactions
- Filter by status (pending, confirmed, rejected)
- Search payments
- Confirm or reject pending payments
- Payment summary statistics

### 4. Service Fees Management
- Set service fee type (percentage or fixed)
- Configure fee value
- Preview calculations
- Update service fees

### 5. Policy & Compliance
- Manage policies (Terms of Service, Privacy Policy, etc.)
- Create, edit, and delete policies
- View user reports
- Handle compliance issues

### 6. Reports
- Generate CSV exports
- Generate PDF reports
- Filter by date range
- Export bookings, users, or listings data

### 7. User Management
- View all users
- Search users
- Filter by role
- Change user roles (guest, host, admin)
- User statistics

## Firestore Collections Used

The admin dashboard uses the following collections:

- `bookings` - All booking records
- `users` - User accounts (with role field for admin)
- `properties` - Property listings
- `experiences` - Experience listings
- `services` - Service listings
- `transactions` - Payment transactions
- `reviews` - Reviews (for analytics)
- `policies` - Policy documents
- `reports` - User reports
- `settings` - App settings (service fees)

## Security Notes

- Admin routes are protected by `ProtectedAdminRoute`
- Admin role is checked via `useAdminStatus` hook
- Only users with `role: "admin"` can access admin features
- Admin actions are logged (can be enhanced with audit logs)

## Next Steps

After setting up the admin dashboard, you can:

1. **Set up your first admin user** using one of the methods above
2. **Navigate to `/Admin`** and test all features
3. **Configure service fees** in the Service Fees section
4. **Review and confirm payments** in the Payment Review section
5. **Set up policies** in Policy & Compliance section

## Troubleshooting

**Issue**: "Access Denied" message
- **Solution**: Ensure the user document has `role: "admin"` or `accType: "admin"`

**Issue**: Dashboard shows "No data"
- **Solution**: Ensure Firestore collections exist and have data

**Issue**: Payment review not working
- **Solution**: Check that `transactions` collection exists and has payment records

**Issue**: Reports not generating
- **Solution**: Ensure data exists in the collections you're trying to export

