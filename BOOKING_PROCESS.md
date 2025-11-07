# Booking Process Flow

## Overview
The booking process supports two payment methods:
1. **E-Wallet Payment** (deducts from guest's wallet balance)
2. **PayPal Payment** (processes via PayPal Sandbox)

Both methods automatically add earnings to the host's wallet upon successful payment.

---

## Step-by-Step Booking Process

### **Step 1: Guest Selects Property**
- Guest browses properties on the homepage
- Clicks on a property to view details
- Modal opens showing property information

### **Step 2: Guest Fills Booking Details**
- **Check-in Date**: Select start date
- **Check-out Date**: Select end date
- **Number of Guests**: Enter guest count
- **Coupon Code** (Optional): Apply discount coupon
- **Payment Method**: Choose between:
  - **E-Wallet**: Pay from wallet balance
  - **PayPal**: Pay via PayPal Sandbox

### **Step 3: System Validates Booking**
- ✅ Checks if dates are available (no conflicts with existing bookings)
- ✅ Validates date format and logic (check-out after check-in)
- ✅ Calculates total price:
  ```
  Base Price = (Price per Night × Nights × Guests)
  Listing Discount = Base Price × (discountPercentage / 100)
  Coupon Discount = Applied if coupon code valid
  Final Price = Base Price - Listing Discount - Coupon Discount
  ```

### **Step 4: Create Booking Record**
- Creates a booking document in Firestore `bookings` collection
- Status: `"pending"` (waiting for payment)
- Includes:
  - `listingId`, `hostId`, `guestId`
  - `startDate`, `endDate`, `guests`
  - `totalPrice`, `basePrice`, `discountAmount`
  - `couponCode` (if applied)
  - `status: "pending"`

### **Step 5: Payment Processing**

#### **Option A: E-Wallet Payment**
1. **Validate Balance**
   - Checks if guest has sufficient balance
   - Shows error if balance < final price

2. **Process Payment**
   - Deducts amount from guest's wallet balance
   - Records transaction in `transactions` collection:
     - Type: `"payment"`
     - Status: `"completed"`
     - Includes `balanceBefore` and `balanceAfter`

3. **Add Host Earnings**
   - Adds payment amount to host's wallet `earnings` field
   - Creates earnings transaction:
     - Type: `"earnings"`
     - Status: `"completed"`
     - Linked to `bookingId`

4. **Update Booking**
   - Sets `status: "confirmed"`
   - Sets `paymentStatus: "paid"`
   - Sets `paymentMethod: "wallet"`

5. **Award Points**
   - Guest receives reward points for booking

#### **Option B: PayPal Payment**
1. **Create Booking First**
   - Booking created with `status: "pending"`
   - PayPal payment component appears

2. **Guest Completes PayPal Payment**
   - Guest clicks PayPal button
   - Redirected to PayPal Sandbox
   - Completes payment using guest PayPal account

3. **PayPal Payment Success**
   - PayPal transaction recorded in `transactions`:
     - Type: `"paypal_payment"`
     - Status: `"completed"`
     - Includes `paypalOrderId` and `paypalTransactionId`

4. **Add Host Earnings**
   - Automatically adds payment amount to host's wallet
   - Creates earnings transaction for host

5. **Update Booking**
   - Sets `status: "confirmed"`
   - Sets `paymentStatus: "paid"`
   - Sets `paymentMethod: "paypal"`
   - Stores PayPal order ID

6. **Award Points**
   - Guest receives reward points for booking

---

## Data Flow

### **Firestore Collections**

#### **1. `bookings` Collection**
```javascript
{
  id: "booking_id",
  listingId: "property_id",
  hostId: "host_user_id",
  guestId: "guest_user_id",
  startDate: "2024-01-15",
  endDate: "2024-01-20",
  guests: 2,
  nights: 5,
  pricePerNight: 1000,
  basePrice: 10000,
  discountAmount: 500,
  totalPrice: 9500,
  couponCode: "SAVE20" || null,
  currency: "PHP",
  status: "pending" | "confirmed" | "cancelled",
  paymentStatus: "pending" | "paid",
  paymentMethod: "wallet" | "paypal" || null,
  paypalOrderId: "order_id" || null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### **2. `transactions` Collection**
**Guest Payment Transaction:**
```javascript
{
  userId: "guest_user_id",
  type: "payment" | "paypal_payment",
  amount: 9500,
  discountAmount: 500,
  couponCode: "SAVE20" || null,
  bookingId: "booking_id",
  balanceBefore: 10000,  // (wallet only)
  balanceAfter: 500,     // (wallet only)
  paymentMethod: "wallet" | "paypal",
  paypalOrderId: "order_id" || null,  // (PayPal only)
  currency: "PHP",
  status: "completed",
  createdAt: Timestamp
}
```

**Host Earnings Transaction:**
```javascript
{
  hostId: "host_user_id",
  type: "earnings",
  amount: 9500,
  bookingId: "booking_id",
  currency: "PHP",
  status: "completed",
  createdAt: Timestamp
}
```

#### **3. `wallets` Collection**
**Guest Wallet:**
```javascript
{
  balance: 500,  // Updated after payment
  currency: "PHP",
  updatedAt: Timestamp
}
```

**Host Wallet:**
```javascript
{
  earnings: 9500,  // Total earnings accumulated
  pendingEarnings: 0,
  currency: "PHP",
  updatedAt: Timestamp
}
```

---

## Key Functions

### **1. `createBooking()` (BookingContext)**
- Validates availability
- Calculates pricing
- Creates booking document
- Returns booking object with `id` and `hostId`

### **2. `pay()` (WalletContext)**
- Validates balance (wallet only)
- Applies coupon discount
- Deducts from guest balance
- Records payment transaction
- Adds host earnings (if `hostId` provided)
- Updates booking status

### **3. `addHostEarnings()` (WalletContext)**
- Updates host wallet `earnings` field
- Creates earnings transaction
- Called automatically by `pay()` and PayPal payment

### **4. PayPal Payment Component**
- Handles PayPal Sandbox payment
- Records PayPal transaction
- Automatically fetches `hostId` from booking
- Adds host earnings on success
- Updates booking status

---

## Error Handling

### **Availability Errors**
- Dates already booked → Shows conflicting dates
- Invalid date range → Shows validation error
- Check-out before check-in → Validation error

### **Payment Errors**
- **Wallet**: Insufficient balance → Shows available balance
- **PayPal**: Payment failed → Shows error message
- **Coupon**: Invalid/expired → Proceeds without coupon

### **Booking Errors**
- Missing required fields → Validation errors shown
- Network errors → Error message displayed

---

## Success Flow

1. ✅ Booking created
2. ✅ Payment processed
3. ✅ Host earnings added
4. ✅ Booking status: `"confirmed"`
5. ✅ Points awarded to guest
6. ✅ Success message displayed
7. ✅ Modal closes after 2 seconds
8. ✅ Guest can view booking in "My Booking" page
9. ✅ Host can view booking in "Host Booking" page

---

## Notes

- **Coupon codes** are applied before payment
- **Host earnings** are added automatically for both payment methods
- **Points** are awarded after successful payment
- **Booking status** changes from `"pending"` → `"confirmed"` after payment
- **Transaction history** is visible in E-Wallet page for both guests and hosts

