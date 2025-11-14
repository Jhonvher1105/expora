import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [creating, setCreating] = useState(false);

  // Load service fee configuration
  const getServiceFee = useCallback(async () => {
    try {
      const feeRef = doc(db, "settings", "serviceFee");
      const feeSnap = await getDoc(feeRef);
      if (feeSnap.exists()) {
        return feeSnap.data();
      }
      // Return default if not set
      return { type: "percentage", value: 10 };
    } catch (error) {
      console.error("Error loading service fee:", error);
      // Return default on error
      return { type: "percentage", value: 10 };
    }
  }, []);

  // Calculate service fee based on amount
  const calculateServiceFee = useCallback(async (amount) => {
    const serviceFeeConfig = await getServiceFee();
    if (!serviceFeeConfig || !serviceFeeConfig.value) {
      return 0;
    }

    if (serviceFeeConfig.type === "percentage") {
      return (amount * serviceFeeConfig.value) / 100;
    } else if (serviceFeeConfig.type === "fixed") {
      return serviceFeeConfig.value;
    }
    return 0;
  }, [getServiceFee]);

  const getListingBookings = useCallback(async (listingId) => {
    const q = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, []);

  // Helper to convert date to timestamp (handles Firestore Timestamps, Date objects, and strings)
  const toTimestamp = (date) => {
    if (!date) return null;
    // If it's a Firestore Timestamp, convert to Date first
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().getTime();
    }
    // If it's already a Date object or can be converted
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.getTime();
  };

  // Helper function to format date as YYYY-MM-DD in local time (no timezone conversion)
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date as MM/DD/YYYY for display
  const formatDateDisplay = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  const isOverlapping = (startA, endA, startB, endB) => {
    const aStart = toTimestamp(startA);
    const aEnd = toTimestamp(endA);
    const bStart = toTimestamp(startB);
    const bEnd = toTimestamp(endB);
    
    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
    if (Number.isNaN(aStart) || Number.isNaN(aEnd) || Number.isNaN(bStart) || Number.isNaN(bEnd)) return false;
    
    // Overlap when ranges intersect: aStart <= bEnd && bStart <= aEnd
    return aStart <= bEnd && bStart <= aEnd;
  };

  const checkAvailability = useCallback(async (listingId, startDate, endDate) => {
    if (!listingId || !startDate || !endDate) return { available: false, reason: "Please select check-in and check-out dates" };
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { available: false, reason: "Invalid date format" };
    }
    if (end <= start) {
      return { available: false, reason: "Check-out date must be after check-in date" };
    }

    const existing = await getListingBookings(listingId);
    const conflictingBookings = existing.filter((b) => 
      b.status !== "cancelled" && 
      isOverlapping(startDate, endDate, b.startDate, b.endDate)
    );

    if (conflictingBookings.length > 0) {
      // Find the conflicting booking dates for better error message
      const conflictingDates = conflictingBookings.map(b => {
        // Handle Firestore Timestamps
        let bStart = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
        let bEnd = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate);
        
        // Normalize dates to local midnight to avoid timezone issues
        bStart = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate());
        bEnd = new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate());
        
        return `${formatDateDisplay(bStart)} - ${formatDateDisplay(bEnd)}`;
      }).join(", ");
      
      return { 
        available: false, 
        reason: `Dates not available. These dates are already booked: ${conflictingDates}` 
      };
    }
    
    return { available: true };
  }, [getListingBookings]);

  const createBooking = useCallback(async ({
    listing,
    guestUser,
    startDate,
    endDate,
    guests = 1,
    couponCode = null,
  }) => {
    if (!listing || !guestUser) throw new Error("Missing listing or user");
    setCreating(true);
    try {
      const availability = await checkAvailability(listing.id, startDate, endDate);
      if (!availability.available) throw new Error(availability.reason || "Unavailable");

      // Calculate total price
      const start = new Date(startDate);
      const end = new Date(endDate);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const basePrice = (listing.price || 0) * nights * (Number(guests) || 1);
      
      // Apply listing discount if exists
      let discountAmount = 0;
      if (listing.discountPercentage) {
        discountAmount = (basePrice * listing.discountPercentage) / 100;
      }

      // Calculate price after discount (before service fee)
      const priceAfterDiscount = basePrice - discountAmount;

      // Calculate service fee (on the price after discount)
      const serviceFee = await calculateServiceFee(priceAfterDiscount);

      // Total price includes service fee (guest pays this)
      const totalPrice = priceAfterDiscount + serviceFee;

      // Host earnings (price after discount minus service fee, which equals priceAfterDiscount - serviceFee)
      // Actually, service fee is added to guest payment, so host receives priceAfterDiscount
      const hostEarnings = priceAfterDiscount;

      const payload = {
        listingId: listing.id,
        listingType: listing.category || "properties",
        listingTitle: listing.title || "",
        hostId: listing.ownerId || null,
        guestId: guestUser.uid,
        startDate,
        endDate,
        guests: Number(guests) || 1,
        nights,
        pricePerNight: listing.price || 0,
        basePrice,
        discountAmount,
        serviceFee,
        hostEarnings,
        totalPrice, // Guest pays this (includes service fee)
        couponCode,
        currency: "PHP",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "bookings"), payload);
      return { id: ref.id, ...payload };
    } finally {
      setCreating(false);
    }
  }, [checkAvailability, calculateServiceFee]);

  const value = useMemo(() => ({ 
    creating, 
    checkAvailability, 
    createBooking, 
    getListingBookings, 
    getServiceFee, 
    calculateServiceFee 
  }), [creating, checkAvailability, createBooking, getListingBookings, getServiceFee, calculateServiceFee]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}


