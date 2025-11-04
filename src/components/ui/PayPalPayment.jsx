import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useWallet } from '../../context/WalletContext';

// PayPal Sandbox Client ID - Replace with your actual PayPal Sandbox Client ID
// Get your Client ID from: https://developer.paypal.com/dashboard/
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID_HERE';

export default function PayPalPayment({ 
  amount, 
  bookingId, 
  couponCode, 
  onSuccess, 
  onError,
  currency = 'PHP' 
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { applyCoupon } = useWallet();
  const currentUser = auth.currentUser;

  // Convert PHP to USD for PayPal (PayPal uses USD as base currency)
  // Note: You'll need to implement real-time currency conversion or use USD prices
  const convertToUSD = (phpAmount) => {
    // Simplified conversion - in production, use real-time exchange rates
    // 1 PHP ≈ 0.018 USD (approximate)
    return (phpAmount * 0.018).toFixed(2);
  };

  const handleApprove = async (data, actions) => {
    setIsProcessing(true);
    try {
      // Capture the payment
      const order = await actions.order.capture();
      
      // Calculate final amount with coupon
      let finalAmount = amount;
      let discountAmount = 0;
      
      if (couponCode) {
        try {
          discountAmount = await applyCoupon(couponCode, amount);
          finalAmount = amount - discountAmount;
        } catch (e) {
          console.warn("Coupon application failed:", e.message);
        }
      }

      // Record PayPal transaction in Firestore
      if (currentUser) {
        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.uid,
          type: 'paypal_payment',
          amount: finalAmount,
          discountAmount,
          couponCode: couponCode || null,
          bookingId,
          paymentMethod: 'paypal',
          paypalOrderId: order.id,
          paypalTransactionId: order.purchase_units[0].payments.captures[0].id,
          currency: currency,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      }

      // Update booking status
      if (bookingId) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paypalOrderId: order.id,
          status: 'confirmed',
          updatedAt: serverTimestamp(),
        });
      }

      setIsProcessing(false);
      if (onSuccess) {
        onSuccess({
          orderId: order.id,
          transactionId: order.purchase_units[0].payments.captures[0].id,
          amount: finalAmount,
        });
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      setIsProcessing(false);
      if (onError) {
        onError(error);
      }
    }
  };

  const createOrder = (data, actions) => {
    let finalAmount = amount;
    
    // Apply coupon discount if needed (calculate on frontend)
    // For full coupon validation, you'd need to do this server-side
    const usdAmount = convertToUSD(finalAmount);
    
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: usdAmount,
            currency_code: 'USD',
          },
          description: `Booking payment for ${bookingId || 'booking'}`,
        },
      ],
    });
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <PayPalScriptProvider options={{ 
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
      }}>
        <PayPalButtons
          createOrder={createOrder}
          onApprove={handleApprove}
          onError={(err) => {
            console.error('PayPal error:', err);
            if (onError) onError(err);
          }}
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
          }}
          disabled={isProcessing}
        />
      </PayPalScriptProvider>
      {isProcessing && (
        <p style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>
          Processing payment...
        </p>
      )}
    </div>
  );
}

