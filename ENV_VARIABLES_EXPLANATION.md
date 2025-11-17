# EmailJS Environment Variables - What Affects What

## 📧 Two Separate Email Systems

Your app uses **two separate EmailJS configurations**:

### 1. **Email Verification** (Registration/Login)
Uses these variables:
- `VITE_EMAILJS_SERVICE_ID` - Service ID for verification emails
- `VITE_EMAILJS_TEMPLATE_ID` - Template ID for verification emails
- `VITE_EMAILJS_PUBLIC_KEY` - Public Key for verification emails

### 2. **Booking Notifications** (Booking confirmations, cancellations, host notifications)
Uses these variables:
- `VITE_EMAILJS_NOTIFICATION_SERVICE_ID` - Service ID for booking emails
- `VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY` - Public Key for booking emails
- `VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID` - Template for confirmations
- `VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID` - Template for cancellations
- `VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID` - Template for host notifications

---

## ✅ Safe Changes (Won't Break Email Verification)

You can safely change these **without affecting email verification**:

```env
# These are ONLY for booking notifications
VITE_EMAILJS_NOTIFICATION_SERVICE_ID=service_cdkso21
VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY=your_key_here
VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID=template_y4d77pg
VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID=template_ztbtzyc
VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID=template_y4d77pg
```

**Email verification will continue to work** because it uses different variables.

---

## ⚠️ Changes That WILL Affect Email Verification

If you change these, email verification **will break**:

```env
# These are used by email verification
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

**Only change these if:**
- You're updating to a new EmailJS account
- You're fixing a broken email verification
- You're intentionally switching services

---

## 🔄 Recommended Setup

For most cases, you can use the **same Public Key** for both:

```env
# Email Verification (Registration)
VITE_EMAILJS_SERVICE_ID=your_verification_service_id
VITE_EMAILJS_TEMPLATE_ID=your_verification_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here

# Booking Notifications (Can use same public key)
VITE_EMAILJS_NOTIFICATION_SERVICE_ID=service_cdkso21
VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY=your_public_key_here  # Same key is fine!
VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID=template_y4d77pg
VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID=template_ztbtzyc
VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID=template_y4d77pg
```

**Note**: You can use the same Public Key for both systems if they're in the same EmailJS account.

---

## 📋 Quick Reference

| Variable | Used By | Safe to Change? |
|----------|---------|----------------|
| `VITE_EMAILJS_SERVICE_ID` | Email Verification | ⚠️ Only if fixing verification |
| `VITE_EMAILJS_TEMPLATE_ID` | Email Verification | ⚠️ Only if fixing verification |
| `VITE_EMAILJS_PUBLIC_KEY` | Email Verification | ⚠️ Only if fixing verification |
| `VITE_EMAILJS_NOTIFICATION_SERVICE_ID` | Booking Emails | ✅ Safe to change |
| `VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY` | Booking Emails | ✅ Safe to change |
| `VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID` | Booking Emails | ✅ Safe to change |
| `VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID` | Booking Emails | ✅ Safe to change |
| `VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID` | Booking Emails | ✅ Safe to change |

---

## 🎯 Answer to Your Question

**"If I change the .env (3-4 variables), will my email verification still work?"**

**YES, if you only change the NOTIFICATION variables:**
- ✅ `VITE_EMAILJS_NOTIFICATION_SERVICE_ID`
- ✅ `VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY`
- ✅ `VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID`
- ✅ `VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID`
- ✅ `VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID`

**NO, if you change the VERIFICATION variables:**
- ❌ `VITE_EMAILJS_SERVICE_ID`
- ❌ `VITE_EMAILJS_TEMPLATE_ID`
- ❌ `VITE_EMAILJS_PUBLIC_KEY`

---

## 💡 Best Practice

1. **Keep verification variables unchanged** (unless they're broken)
2. **Update notification variables** to fix booking email errors
3. **Use the same Public Key** for both if they're in the same EmailJS account
4. **Test email verification** after any changes to be sure

---

**Last Updated**: After clarifying environment variable usage

