import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadWallet(user.uid);
      } else {
        setBalance(0);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loadWallet = useCallback(async (uid) => {
    try {
      setLoading(true);
      const walletRef = doc(db, "wallets", uid);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        setBalance(walletSnap.data().balance || 0);
      } else {
        // Initialize wallet with 1000 PHP default balance
        await setDoc(walletRef, { balance: 1000, currency: "PHP", createdAt: serverTimestamp() });
        setBalance(1000);
      }
    } catch (error) {
      console.error("Error loading wallet:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const topUp = useCallback(async (amount) => {
    if (!currentUser || amount <= 0) throw new Error("Invalid amount");
    try {
      const walletRef = doc(db, "wallets", currentUser.uid);
      const newBalance = balance + Number(amount);
      await setDoc(walletRef, { balance: newBalance, currency: "PHP", updatedAt: serverTimestamp() }, { merge: true });
      
      // Record transaction
      await addDoc(collection(db, "transactions"), {
        userId: currentUser.uid,
        type: "topup",
        amount: Number(amount),
        balanceBefore: balance,
        balanceAfter: newBalance,
        currency: "PHP",
        status: "completed",
        createdAt: serverTimestamp(),
      });

      setBalance(newBalance);
      return { success: true, newBalance };
    } catch (error) {
      console.error("Error topping up:", error);
      throw error;
    }
  }, [currentUser, balance]);

  const applyCoupon = useCallback(async (code, amount) => {
    if (!code || !currentUser) return 0;
    try {
      const q = query(collection(db, "coupons"), where("code", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Invalid coupon code");

      const coupon = snap.docs[0].data();
      const now = new Date();
      const startDate = coupon.startDate?.toDate();
      const endDate = coupon.endDate?.toDate();

      if (startDate && now < startDate) throw new Error("Coupon not yet valid");
      if (endDate && now > endDate) throw new Error("Coupon expired");
      if (coupon.usedBy && coupon.usedBy.includes(currentUser.uid)) throw new Error("Coupon already used");

      // Calculate discount
      let discount = 0;
      if (coupon.type === "percentage") {
        discount = (amount * coupon.value) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      } else if (coupon.type === "fixed") {
        discount = Math.min(coupon.value, amount);
      }

      return discount;
    } catch (error) {
      console.error("Error applying coupon:", error);
      throw error;
    }
  }, [currentUser]);

  // Add host earnings (with service fee deduction)
  const addHostEarnings = useCallback(async (hostId, amount, bookingId, serviceFee = 0) => {
    try {
      const hostWalletRef = doc(db, "wallets", hostId);
      const hostWalletSnap = await getDoc(hostWalletRef);
      
      let currentEarnings = 0;
      if (hostWalletSnap.exists()) {
        currentEarnings = hostWalletSnap.data().earnings || 0;
      }

      // Host earnings = amount - service fee
      // Note: If booking already has serviceFee deducted (hostEarnings field), use that
      // Otherwise, deduct service fee here
      const hostEarningsAmount = Number(amount) - Number(serviceFee);
      const newEarnings = currentEarnings + hostEarningsAmount;

      await setDoc(
        hostWalletRef,
        {
          earnings: newEarnings,
          currency: "PHP",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Record host earnings transaction (amount received by host)
      await addDoc(collection(db, "transactions"), {
        hostId,
        type: "earnings",
        amount: hostEarningsAmount,
        serviceFee: Number(serviceFee),
        grossAmount: Number(amount), // Total before service fee
        bookingId,
        currency: "PHP",
        status: "completed",
        createdAt: serverTimestamp(),
      });

      // Record service fee transaction (platform revenue)
      if (serviceFee > 0) {
        await addDoc(collection(db, "transactions"), {
          type: "service_fee",
          amount: Number(serviceFee),
          bookingId,
          hostId,
          currency: "PHP",
          status: "completed",
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error adding host earnings:", error);
      throw error;
    }
  }, []);

  const pay = useCallback(async (amount, bookingId, couponCode = null, hostId = null) => {
    if (!currentUser || amount <= 0) throw new Error("Invalid amount");
    
    let finalAmount = amount;
    let discountAmount = 0;

    // Apply coupon if provided
    if (couponCode) {
      try {
        discountAmount = await applyCoupon(couponCode, amount);
        finalAmount = amount - discountAmount;
      } catch (e) {
        // If coupon fails, proceed without coupon
        console.warn("Coupon application failed:", e.message);
      }
    }

    try {
      // Fetch fresh balance from Firestore to avoid race conditions
      const walletRef = doc(db, "wallets", currentUser.uid);
      const walletSnap = await getDoc(walletRef);
      let currentBalance = balance;
      
      if (walletSnap.exists()) {
        currentBalance = walletSnap.data().balance || 0;
      }

      if (currentBalance < finalAmount) throw new Error("Insufficient balance");

      const newBalance = currentBalance - finalAmount;
      await setDoc(walletRef, { balance: newBalance, currency: "PHP", updatedAt: serverTimestamp() }, { merge: true });

      // Record guest payment transaction
      await addDoc(collection(db, "transactions"), {
        userId: currentUser.uid,
        type: "payment",
        amount: finalAmount,
        discountAmount,
        couponCode: couponCode || null,
        bookingId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        currency: "PHP",
        status: "completed",
        createdAt: serverTimestamp(),
      });

      // Note: Host earnings will be added when host manually confirms the booking
      // This prevents earnings from being added if host rejects the booking

      setBalance(newBalance);
      return { success: true, newBalance, finalAmount, discountAmount };
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }, [currentUser, balance, applyCoupon, addHostEarnings]);

  const value = useMemo(() => ({
    balance,
    loading,
    topUp,
    pay,
    applyCoupon,
    addHostEarnings,
  }), [balance, loading, topUp, pay, applyCoupon, addHostEarnings]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}


