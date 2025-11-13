# E-Wallet System Flow Documentation

## Overview

The E-Wallet system in Expora manages financial transactions for both guests and hosts. It handles payments, earnings, top-ups, and maintains transaction history. The system uses Firestore to store wallet balances and transaction records.

---

## Architecture

### Components
- **WalletContext** (`src/context/WalletContext.jsx`): Manages wallet state and operations
- **WalletPage** (`src/components/UserFolder/WalletPage.jsx`): UI for viewing balance and transactions
- **Firestore Collections**:
  - `wallets`: Stores user wallet balances and earnings
  - `transactions`: Records all financial transactions

### Key Functions
- `loadWallet()`: Loads wallet balance from Firestore
- `topUp()`: Adds funds to guest wallet
- `pay()`: Processes payment from guest wallet
- `addHostEarnings()`: Adds earnings to host wallet (with service fee deduction)

---

## Complete Flow Diagrams

### 1. Guest Wallet Initialization Flow

```
User Registration/Login
    ↓
WalletContext checks authentication
    ↓
loadWallet() called
    ↓
Check Firestore: wallets/{userId}
    ↓
┌─────────────────────────┐
│ Wallet exists?          │
└─────────────────────────┘
    │                    │
   YES                  NO
    │                    │
    │                    ↓
    │            Create new wallet document
    │            - balance: 1000 PHP (default)
    │            - currency: "PHP"
    │            - createdAt: timestamp
    │                    │
    └────────────────────┘
    ↓
Set balance in state
    ↓
Display balance in UI
```

**Code Location**: `WalletContext.jsx` lines 26-43

---

### 2. Guest Payment Flow (Wallet Payment)

```
Guest selects listing and dates
    ↓
Guest clicks "Book & Pay Now (Wallet)"
    ↓
┌─────────────────────────────────────┐
│ Validation Steps                    │
│ 1. Check dates are valid            │
│ 2. Check guest count                │
│ 3. Check availability               │
│ 4. Calculate total price            │
└─────────────────────────────────────┘
    ↓
Check wallet balance >= total price
    ↓
┌─────────────────────────────────────┐
│ Insufficient Balance?                │
└─────────────────────────────────────┘
    │                    │
   YES                  NO
    │                    │
    │                    ↓
    │            Create booking in Firestore
    │            - status: "pending"
    │            - paymentStatus: "pending"
    │                    │
    │                    ↓
    │            Call pay() function
    │                    │
    │                    ↓
    │            ┌────────────────────────┐
    │            │ Apply coupon (if any)  │
    │            └────────────────────────┘
    │                    │
    │                    ↓
    │            Fetch fresh balance from Firestore
    │            (to avoid race conditions)
    │                    │
    │                    ↓
    │            Check balance again
    │                    │
    │                    ↓
    │            Calculate new balance:
    │            newBalance = currentBalance - finalAmount
    │                    │
    │                    ↓
    │            Update wallets/{userId}:
    │            - balance: newBalance
    │            - updatedAt: timestamp
    │                    │
    │                    ↓
    │            Create transaction record:
    │            - type: "payment"
    │            - amount: finalAmount
    │            - discountAmount: (if coupon)
    │            - bookingId: booking.id
    │            - balanceBefore: currentBalance
    │            - balanceAfter: newBalance
    │            - status: "completed"
    │                    │
    │                    ↓
    │            Update booking:
    │            - paymentStatus: "paid"
    │            - paymentMethod: "wallet"
    │                    │
    │                    ↓
    │            Award points (PointsContext)
    │                    │
    │                    ↓
    │            Show success message
    │            "Payment successful! Booking pending host confirmation"
    │                    │
    └────────────────────┘
    ↓
Show error: "Insufficient balance"
```

**Code Locations**:
- Booking creation: `HomeBody.jsx` lines 1627-1657
- Payment processing: `WalletContext.jsx` lines 162-218
- Balance check: `HomeBody.jsx` lines 1620-1624

---

### 3. Host Earnings Flow (When Host Confirms Booking)

```
Host views pending bookings
    ↓
Host clicks "Confirm Booking"
    ↓
┌─────────────────────────────────────┐
│ Confirmation Dialog                 │
│ "Are you sure you want to confirm?" │
└─────────────────────────────────────┘
    ↓
Update booking status to "confirmed"
    ↓
┌─────────────────────────────────────┐
│ Check payment status                 │
│ paymentStatus === "paid"?            │
└─────────────────────────────────────┘
    │                    │
   NO                   YES
    │                    │
    │                    ↓
    │            Calculate host earnings:
    │            hostEarnings = booking.hostEarnings
    │            OR
    │            hostEarnings = totalPrice - serviceFee
    │                    │
    │                    ↓
    │            Get host wallet:
    │            wallets/{hostId}
    │                    │
    │                    ↓
    │            Calculate new earnings:
    │            newEarnings = currentEarnings + hostEarnings
    │                    │
    │                    ↓
    │            Update host wallet:
    │            - earnings: newEarnings
    │            - updatedAt: timestamp
    │                    │
    │                    ↓
    │            Create earnings transaction:
    │            - type: "earnings"
    │            - amount: hostEarnings
    │            - serviceFee: serviceFee
    │            - grossAmount: totalPrice
    │            - bookingId: booking.id
    │            - status: "completed"
    │                    ↓
    │            Create service fee transaction:
    │            - type: "service_fee"
    │            - amount: serviceFee
    │            - bookingId: booking.id
    │            - status: "completed"
    │                    │
    └────────────────────┘
    ↓
Show success: "Booking confirmed! Earnings added to wallet"
```

**Code Location**: `HostBooking.jsx` lines 138-229

---

### 4. Top-Up Flow (Adding Funds to Wallet)

```
Guest navigates to WalletPage
    ↓
Guest clicks "Top Up" (if implemented)
    ↓
Enter amount to add
    ↓
Call topUp(amount)
    ↓
┌─────────────────────────────────────┐
│ Validation                          │
│ - User authenticated?               │
│ - Amount > 0?                       │
└─────────────────────────────────────┘
    ↓
Calculate new balance:
newBalance = currentBalance + amount
    ↓
Update wallets/{userId}:
- balance: newBalance
- updatedAt: timestamp
    ↓
Create transaction record:
- type: "topup"
- amount: amount
- balanceBefore: currentBalance
- balanceAfter: newBalance
- status: "completed"
    ↓
Update state: setBalance(newBalance)
    ↓
Show success message
```

**Code Location**: `WalletContext.jsx` lines 45-70

---

### 5. Coupon Application Flow

```
Guest enters coupon code during booking
    ↓
Call applyCoupon(code, amount)
    ↓
Query Firestore: coupons collection
Where code == couponCode.toUpperCase()
    ↓
┌─────────────────────────────────────┐
│ Coupon found?                       │
└─────────────────────────────────────┘
    │                    │
   NO                   YES
    │                    │
    │                    ↓
    │            Check coupon validity:
    │            - Current date >= startDate?
    │            - Current date <= endDate?
    │            - Not already used by user?
    │                    │
    │                    ↓
    │            Calculate discount:
    │            ┌──────────────────────┐
    │            │ Coupon type?         │
    │            └──────────────────────┘
    │                    │
    │        ┌───────────┴───────────┐
    │        │                       │
    │    percentage              fixed
    │        │                       │
    │        ↓                       ↓
    │    discount =              discount =
    │    (amount * value) / 100   min(value, amount)
    │        │                       │
    │        └───────────┬───────────┘
    │                    │
    │                    ↓
    │            Apply maxDiscount limit (if exists)
    │                    │
    │                    ↓
    │            Return discount amount
    │                    │
    └────────────────────┘
    ↓
Throw error: "Invalid coupon code"
```

**Code Location**: `WalletContext.jsx` lines 72-102

---

## Data Structures

### Wallet Document (`wallets/{userId}`)

```javascript
{
  balance: number,        // Guest wallet balance (PHP)
  earnings: number,       // Host earnings balance (PHP)
  currency: "PHP",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note**: 
- Guests have `balance` field
- Hosts have `earnings` field
- A user can be both guest and host (both fields exist)

### Transaction Document (`transactions/{transactionId}`)

#### Guest Payment Transaction
```javascript
{
  userId: string,              // Guest user ID
  type: "payment",
  amount: number,              // Final amount paid
  discountAmount: number,       // Coupon discount (if any)
  couponCode: string,          // Coupon code used (if any)
  bookingId: string,
  balanceBefore: number,
  balanceAfter: number,
  currency: "PHP",
  status: "completed",
  createdAt: timestamp
}
```

#### Host Earnings Transaction
```javascript
{
  hostId: string,              // Host user ID
  type: "earnings",
  amount: number,              // Net earnings (after service fee)
  serviceFee: number,          // Service fee deducted
  grossAmount: number,         // Total before service fee
  bookingId: string,
  currency: "PHP",
  status: "completed",
  createdAt: timestamp
}
```

#### Service Fee Transaction (Platform Revenue)
```javascript
{
  type: "service_fee",
  amount: number,              // Service fee amount
  bookingId: string,
  hostId: string,
  currency: "PHP",
  status: "completed",
  createdAt: timestamp
}
```

#### Top-Up Transaction
```javascript
{
  userId: string,
  type: "topup",
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  currency: "PHP",
  status: "completed",
  createdAt: timestamp
}
```

---

## Service Fee Calculation

### How Service Fees Work

1. **Service Fee Configuration** (Admin sets in admin dashboard):
   - Type: "percentage" or "fixed"
   - Value: Percentage (e.g., 10) or fixed amount (e.g., 100)

2. **Service Fee Calculation** (During booking):
   ```
   basePrice = listing.price * nights * guests
   discountAmount = basePrice * (listing.discountPercentage / 100)
   priceAfterDiscount = basePrice - discountAmount
   
   IF serviceFeeType === "percentage":
     serviceFee = priceAfterDiscount * (serviceFeeValue / 100)
   ELSE IF serviceFeeType === "fixed":
     serviceFee = serviceFeeValue
   
   totalPrice = priceAfterDiscount + serviceFee
   ```

3. **Payment Flow**:
   - Guest pays: `totalPrice` (priceAfterDiscount + serviceFee)
   - Host receives: `priceAfterDiscount` (service fee deducted)
   - Platform receives: `serviceFee`

4. **Host Earnings Calculation**:
   ```
   hostEarnings = priceAfterDiscount
   // OR
   hostEarnings = totalPrice - serviceFee
   ```

**Code Location**: `BookingContext.jsx` (service fee calculation)

---

## Transaction States

### Payment Status
- `pending`: Payment not yet processed
- `paid`: Payment completed
- `refunded`: Payment refunded

### Transaction Status
- `completed`: Transaction successfully completed
- `pending`: Transaction in progress
- `failed`: Transaction failed

### Booking Status
- `pending`: Awaiting host confirmation
- `confirmed`: Host confirmed, earnings added
- `cancelled`: Booking cancelled

---

## Important Notes

### 1. Race Condition Prevention
- When processing payment, the system fetches fresh balance from Firestore to avoid race conditions
- This ensures accurate balance checks even with concurrent requests

### 2. Host Earnings Timing
- Host earnings are **NOT** added immediately when guest pays
- Earnings are added **ONLY** when host confirms the booking
- This prevents earnings from being added if host rejects the booking

### 3. Service Fee Handling
- Service fees are calculated during booking creation
- Service fee is deducted from host earnings
- Service fee is recorded as separate transaction for platform revenue tracking

### 4. Default Balance
- New users get 1000 PHP default balance on wallet initialization
- This is set automatically when wallet is first created

### 5. Dual Role Support
- Users can be both guests and hosts
- Wallet document contains both `balance` (for payments) and `earnings` (for host income)
- Transactions are filtered based on user role in WalletPage

---

## Error Handling

### Common Errors

1. **Insufficient Balance**
   - Error: "Insufficient balance"
   - Solution: Guest must top up wallet before booking

2. **Invalid Coupon**
   - Error: "Invalid coupon code" / "Coupon expired" / "Coupon already used"
   - Solution: Use valid, active coupon code

3. **Payment Failure**
   - Error: Payment processing fails
   - Solution: Booking is created but payment status remains "pending"

4. **Earnings Addition Failure**
   - Error: Host earnings fail to add
   - Solution: Error is logged but booking confirmation still succeeds (earnings can be added manually)

---

## UI Components

### WalletPage Features

1. **Balance Tab** (Guests):
   - Current wallet balance
   - Available for bookings

2. **Balance Tab** (Hosts):
   - Total earnings
   - Monthly earnings
   - Pending earnings

3. **Transactions Tab**:
   - Transaction history
   - Filters:
     - Type (payment, earnings, topup, refund)
     - Status (completed, pending, failed)
     - Date range
   - Transaction details:
     - Type, amount, date
     - Booking ID (if applicable)
     - Status badge

---

## Testing Scenarios

### Test Case 1: Guest Payment Flow
1. Guest has 2000 PHP balance
2. Booking total: 1500 PHP
3. Expected: Payment succeeds, balance becomes 500 PHP

### Test Case 2: Insufficient Balance
1. Guest has 500 PHP balance
2. Booking total: 1500 PHP
3. Expected: Error "Insufficient balance"

### Test Case 3: Host Earnings
1. Booking total: 1000 PHP
2. Service fee: 100 PHP (10%)
3. Host confirms booking
4. Expected: Host earnings increase by 900 PHP

### Test Case 4: Coupon Application
1. Booking total: 1000 PHP
2. Coupon: 20% discount, max 150 PHP
3. Expected: Discount = 150 PHP (capped), final amount = 850 PHP

---

## Future Enhancements

1. **Top-Up Integration**: Add payment gateway for wallet top-ups
2. **Refund System**: Implement automatic refunds for cancelled bookings
3. **Payout System**: Allow hosts to withdraw earnings (already partially implemented)
4. **Transaction Notifications**: Email/SMS notifications for transactions
5. **Multi-Currency Support**: Support for multiple currencies
6. **Wallet Limits**: Set maximum balance limits
7. **Transaction Fees**: Add fees for certain transaction types

---

**Last Updated**: Current Date
**Version**: 1.0

