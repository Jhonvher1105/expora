import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [creating, setCreating] = useState(false);

  const getListingBookings = useCallback(async (listingId) => {
    const q = query(collection(db, "bookings"), where("listingId", "==", listingId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, []);

  const isOverlapping = (startA, endA, startB, endB) => {
    const aStart = new Date(startA).getTime();
    const aEnd = new Date(endA).getTime();
    const bStart = new Date(startB).getTime();
    const bEnd = new Date(endB).getTime();
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
        const bStart = new Date(b.startDate).toLocaleDateString();
        const bEnd = new Date(b.endDate).toLocaleDateString();
        return `${bStart} - ${bEnd}`;
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

      const totalPrice = basePrice - discountAmount;

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
        totalPrice,
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
  }, [checkAvailability]);

  const value = useMemo(() => ({ creating, checkAvailability, createBooking }), [creating, checkAvailability, createBooking]);

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


