# EmailJS 400 Error - Booking Email Notifications

## 🔍 Understanding the Error

The error `Failed to send [booking confirmation/host booking notification] email` with a **400 status code** indicates that EmailJS is rejecting the request due to invalid parameters or configuration.

This error can occur for:
- **Host Booking Notification Email** - When a new booking is created
- **Booking Confirmation Email** - When a host confirms a booking
- **Booking Cancellation Email** - When a booking is cancelled

### Error Location
- **File**: `src/utils/emailService.js`
- **Functions**: 
  - `sendHostBookingNotificationEmail()` - Host notification when booking created
  - `sendBookingConfirmationEmail()` - Guest confirmation when host confirms
  - `sendBookingCancellationEmail()` - Guest notification when booking cancelled

### What is `installHook.js`?
The `installHook.js:1` reference in your error is likely from:
- React DevTools browser extension
- A browser extension that injects code
- Not part of your codebase

The actual error is coming from your `emailService.js` file.

---

## 🐛 Common Causes of 400 Error

### 1. **Template ID Doesn't Exist**
The template ID `template_y4d77pg` (default) might not exist in your EmailJS dashboard, or you haven't created a specific template for host booking notifications.

### 2. **Missing Template Variables**
Your EmailJS templates might be missing required variables. Each template type needs different variables:

**Host Booking Notification Template** needs:
- `{{user_email}}`, `{{user_name}}`, `{{to_email}}`
- `{{booking_id}}`, `{{listing_title}}`, `{{booking_dates}}`
- `{{total_price}}`, `{{guests}}`, `{{nights}}`
- `{{guest_name}}` ⚠️ **This is unique to host notifications**

**Booking Confirmation Template** needs:
- `{{user_email}}`, `{{user_name}}`, `{{to_email}}`
- `{{booking_id}}`, `{{listing_title}}`, `{{booking_dates}}`
- `{{total_price}}`, `{{guests}}`, `{{nights}}`

**Booking Cancellation Template** needs:
- All confirmation variables PLUS:
- `{{payment_status}}`, `{{refund_info}}`

### 3. **Invalid Service ID**
The `NOTIFICATION_SERVICE_ID` (`service_cdkso21` by default) might be incorrect or not exist in your EmailJS account.

### 4. **Invalid Public Key**
The `NOTIFICATION_PUBLIC_KEY` might be expired, incorrect, or not set properly.

### 5. **Environment Variables Not Set**
The `.env` file might be missing or not properly configured.

---

## ✅ How to Fix

### Step 1: Check Your EmailJS Dashboard

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Verify your **Service ID** exists:
   - Go to **Email Services**
   - Check if `service_cdkso21` exists (or your custom service ID)
   - If not, create a new service or use an existing one

3. Check your **Public Key**:
   - Go to **Account** → **General**
   - Verify your Public Key is correct

### Step 2: Create Email Templates

You need to create **3 email templates** in your EmailJS dashboard:

#### Template 1: Host Booking Notification
1. Go to **Email Templates** → **Create New Template**
2. Name it: "Host Booking Notification"
3. Add all required variables:
   ```
   {{user_email}}, {{user_name}}, {{to_email}}
   {{booking_id}}, {{listing_title}}, {{booking_dates}}
   {{total_price}}, {{guests}}, {{nights}}
   {{guest_name}} ⚠️ Required for host notifications
   ```
4. **Save the Template ID**

#### Template 2: Booking Confirmation
1. Create another template: "Booking Confirmation"
2. Add variables:
   ```
   {{user_email}}, {{user_name}}, {{to_email}}
   {{booking_id}}, {{listing_title}}, {{booking_dates}}
   {{total_price}}, {{guests}}, {{nights}}
   ```
3. **Save the Template ID**

#### Template 3: Booking Cancellation
1. Create another template: "Booking Cancellation"
2. Add variables (includes confirmation variables PLUS):
   ```
   {{user_email}}, {{user_name}}, {{to_email}}
   {{booking_id}}, {{listing_title}}, {{booking_dates}}
   {{total_price}}, {{guests}}, {{nights}}
   {{payment_status}}, {{refund_info}}
   ```
3. **Save the Template ID**

### Step 3: Update Environment Variables

Create or update your `.env` file in the project root:

```env
# EmailJS General Configuration
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_default_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here

# EmailJS Notification Configuration
VITE_EMAILJS_NOTIFICATION_SERVICE_ID=service_cdkso21
VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY=your_public_key_here

# Booking Email Templates
VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID=template_y4d77pg
VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID=template_ztbtzyc
VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID=template_abc123  # ⚠️ Use your new template ID here
```

### Step 4: Restart Your Development Server

After updating `.env`, restart your dev server:

```bash
npm run dev
```

### Step 5: Test the Fix

1. Create a new booking
2. Check the browser console for detailed error messages
3. The improved error handling will now show:
   - Which template ID is being used
   - Which service ID is being used
   - Specific guidance on what's wrong

---

## 🔧 Enhanced Error Handling

I've improved the error handling in `emailService.js` to provide more detailed information:

- ✅ Validates all required parameters before sending
- ✅ Logs configuration details (without sensitive data)
- ✅ Provides specific error messages for different status codes:
  - **400**: Bad Request (template/service issues)
  - **401**: Authentication failed (public key issue)
  - **404**: Template/Service not found
- ✅ Lists all required template variables
- ✅ Shows which IDs are being used

---

## 📋 Quick Checklist

- [ ] EmailJS account is active
- [ ] Service ID exists and is correct
- [ ] Public Key is valid and not expired
- [ ] Host booking notification template exists
- [ ] Template has all 10 required variables (including `guest_name`)
- [ ] `.env` file has `VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID` set
- [ ] Development server restarted after `.env` changes
- [ ] Check browser console for detailed error messages

---

## 🧪 Testing Template Variables

You can test your EmailJS template directly in the dashboard with these sample values:

```json
{
  "user_email": "host@example.com",
  "user_name": "John Host",
  "to_email": "host@example.com",
  "booking_id": "test123",
  "listing_title": "Beautiful Beach House",
  "booking_dates": "Jan 15, 2024 - Jan 20, 2024",
  "total_price": "₱5000.00",
  "guests": 2,
  "nights": 5,
  "guest_name": "Jane Guest"
}
```

---

## 📞 Still Having Issues?

1. **Check Browser Console**: The enhanced error handling will show detailed information
2. **Check EmailJS Dashboard**: Look at the "Logs" section to see what EmailJS received
3. **Verify Template**: Use EmailJS's "Test" feature to verify your template works
4. **Check Network Tab**: Look at the actual request being sent to EmailJS API

---

## 📝 Notes

- The email notification failure **does not break the booking flow** - bookings will still be created successfully
- The error is logged but doesn't prevent the booking from completing
- This is intentional to ensure bookings work even if email service is down

---

**Last Updated**: After implementing enhanced error handling for all booking email functions in `emailService.js`

---

## 📊 Enhanced Error Handling

All three email functions now have improved error handling:
- ✅ `sendHostBookingNotificationEmail()` - Enhanced error logging
- ✅ `sendBookingConfirmationEmail()` - Enhanced error logging  
- ✅ `sendBookingCancellationEmail()` - Enhanced error logging

Each function now provides:
- Detailed error messages with specific guidance
- Configuration logging (without sensitive data)
- Status code-specific error messages (400, 401, 404)
- Lists of required template variables
- Shows which IDs are being used

