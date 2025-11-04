# PayPal Sandbox Setup Guide

## Steps to Integrate PayPal Sandbox

1. **Create a PayPal Developer Account**
   - Go to https://developer.paypal.com/
   - Sign up or log in with your PayPal account

2. **Create a Sandbox App**
   - Navigate to Dashboard > My Apps & Credentials
   - Click "Create App" under Sandbox
   - Name your app (e.g., "Expora Sandbox")
   - Select "Merchant" as the app type
   - Copy the **Client ID** (you'll need this)

3. **Set Up Sandbox Accounts**
   - Go to Dashboard > Accounts (Sandbox)
   - Create test buyer and seller accounts
   - Use these accounts to test payments

4. **Configure Environment Variables**
   - Create a `.env` file in the root directory
   - Add your PayPal Client ID:
     ```
     VITE_PAYPAL_CLIENT_ID=your_client_id_here
     ```
   - **Important**: Never commit your `.env` file to version control!

5. **Test PayPal Integration**
   - Use Sandbox test accounts:
     - Buyer: Use the sandbox buyer account email
     - Password: Use the sandbox buyer account password
   - Sandbox test cards: https://developer.paypal.com/docs/checkout/test-card-numbers/

## Testing PayPal Payment Flow

1. Select a listing and choose dates
2. Select "PayPal" as payment method
3. Click "Create Booking & Pay with PayPal"
4. Complete PayPal checkout with sandbox credentials
5. Payment will be recorded in Firestore transactions collection

## PayPal Sandbox Test Cards

Use these test cards for payment testing:
- **Visa**: 4111111111111111
- **Mastercard**: 5555555555554444
- **Expiry**: Any future date (e.g., 12/25)
- **CVV**: Any 3 digits (e.g., 123)

## Currency Conversion

**Note**: PayPal uses USD as base currency. The component converts PHP to USD using a simplified rate (1 PHP ≈ 0.018 USD). For production, implement real-time currency conversion using an API like:
- ExchangeRate-API
- Fixer.io
- CurrencyLayer

## Security Notes

- **Sandbox Mode**: Current implementation uses PayPal Sandbox for testing
- **Production**: Change to live PayPal Client ID when going to production
- **Environment Variables**: Keep PayPal credentials secure, never expose in frontend code

