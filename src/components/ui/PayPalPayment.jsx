import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useWallet } from '../../context/WalletContext';

// PayPal Sandbox Client IDs - Separate for guests and hosts
const PAYPAL_CLIENT_ID_GUEST = import.meta.env.VITE_PAYPAL_CLIENT_ID_GUEST || import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID_HERE';
const PAYPAL_CLIENT_ID_HOST = import.meta.env.VITE_PAYPAL_CLIENT_ID_HOST || import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID_HERE';

export default function PayPalPayment({ 
  amount, 
  bookingId, 
  couponCode, 
  hostId,
  onSuccess, 
  onError,
  currency = 'PHP' 
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState(PAYPAL_CLIENT_ID_GUEST);
  const { applyCoupon, addHostEarnings } = useWallet();
  const currentUser = auth.currentUser;

  // Get hostId from booking if not provided
  useEffect(() => {
    const fetchHostId = async () => {
      if (bookingId && !hostId) {
        try {
          const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
          if (bookingDoc.exists()) {
            const bookingData = bookingDoc.data();
            if (bookingData.hostId) {
              // Use the hostId from booking
              // Note: PayPal Client ID should be based on current user (guest), not host
              // Guests use guest PayPal account, hosts receive earnings
            }
          }
        } catch (error) {
          console.error('Error fetching booking:', error);
        }
      }
    };
    fetchHostId();
  }, [bookingId, hostId]);

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

      // Get hostId from booking if not provided
      let bookingHostId = hostId;
      if (bookingId && !bookingHostId) {
        try {
          const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
          if (bookingDoc.exists()) {
            bookingHostId = bookingDoc.data().hostId;
          }
        } catch (error) {
          console.error('Error fetching booking for hostId:', error);
        }
      }

      // Record PayPal transaction in Firestore (guest payment)
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

      // Note: Host earnings will be added when host manually confirms the booking
      // This prevents earnings from being added if host rejects the booking

      // Update booking status - keep as "pending" until host confirms
      if (bookingId) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paypalOrderId: order.id,
          status: 'pending', // Keep pending until host manually confirms
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
        clientId: paypalClientId,
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

