import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
} from "firebase/firestore";

const PointsContext = createContext(null);

export function PointsProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [points, setPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    // Check if user is a guest
    const checkUserRole = useCallback(async (userId) => {
        try {
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role || userData.accType || "guest";
                
                // If role is "host" or "admin", they're not a guest
                if (role === "host" || role === "admin") {
                    return false;
                }
                
                // If role is "guest", check if they have any properties (they might be a host)
                if (role === "guest") {
                    // Check if user has any properties (is a host)
                    const propertiesQuery = query(
                        collection(db, "properties"),
                        where("ownerId", "==", userId),
                        limit(1)
                    );
                    const propertiesSnap = await getDocs(propertiesQuery);
                    
                    // Also check experiences and services
                    const experiencesQuery = query(
                        collection(db, "experiences"),
                        where("ownerId", "==", userId),
                        limit(1)
                    );
                    const experiencesSnap = await getDocs(experiencesQuery);
                    
                    const servicesQuery = query(
                        collection(db, "services"),
                        where("ownerId", "==", userId),
                        limit(1)
                    );
                    const servicesSnap = await getDocs(servicesQuery);
                    
                    // If they have any listings, they're a host and should have points
                    if (!propertiesSnap.empty || !experiencesSnap.empty || !servicesSnap.empty) {
                        return false; // Not a guest (they're a host)
                    }
                }
                
                return role === "guest";
            }
            // If no user document, assume guest
            return true;
        } catch (error) {
            console.error("Error checking user role:", error);
            // Default to guest if error
            return true;
        }
    }, []);

    const loadPoints = useCallback(async (userId) => {
        try {
            setLoading(true);
            const pointsRef = doc(db, "points", userId);
            const pointsSnap = await getDoc(pointsRef);

            if (pointsSnap.exists()) {
                const data = pointsSnap.data();
                setPoints(data.balance || 0);
            } else {
                // Initialize points if doesn't exist (only for non-guests)
                await setDoc(pointsRef, {
                    balance: 0,
                    userId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                setPoints(0);
            }
        } catch (error) {
            console.error("Error loading points:", error);
            setPoints(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const guestStatus = await checkUserRole(user.uid);
                setIsGuest(guestStatus);
                // Only load points if user is not a guest
                if (!guestStatus) {
                    loadPoints(user.uid);
                } else {
                    // Guests have no points system
                    setPoints(0);
                    setLoading(false);
                }
            } else {
                setPoints(0);
                setLoading(false);
                setIsGuest(false);
            }
        });
        return unsub;
    }, [checkUserRole, loadPoints]);

    const awardPoints = useCallback(async (amount, type, description, bookingId = null) => {
        if (!currentUser || amount <= 0) {
            throw new Error("Invalid amount or user");
        }

        // Guests should not have a points system
        if (isGuest) {
            // Silently skip for guests - no error thrown
            return { success: false, message: "Guests do not have a points system" };
        }

        try {
            const userId = currentUser.uid;
            const pointsRef = doc(db, "points", userId);
            const pointsSnap = await getDoc(pointsRef);

            let currentBalance = 0;
            if (pointsSnap.exists()) {
                currentBalance = pointsSnap.data().balance || 0;
            }

            const newBalance = currentBalance + amount;

            // Update points balance
            await setDoc(
                pointsRef,
                {
                    balance: newBalance,
                    userId,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            // Record transaction
            await addDoc(collection(db, "pointsTransactions"), {
                userId,
                type, // 'booking', 'first_booking', 'referral', 'bonus', 'redemption'
                amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                description,
                bookingId: bookingId || null,
                createdAt: serverTimestamp(),
            });

            setPoints(newBalance);
            
            // Reload points from Firestore to ensure sync
            if (currentUser) {
                await loadPoints(currentUser.uid);
            }
            
            return { success: true, newBalance, pointsAwarded: amount };
        } catch (error) {
            console.error("Error awarding points:", error);
            throw error;
        }
    }, [currentUser, isGuest, loadPoints]);

    const redeemPoints = useCallback(async (pointsToRedeem, discountAmount, description, redemptionType = "both") => {
        if (!currentUser || pointsToRedeem <= 0) {
            throw new Error("Invalid redemption amount");
        }

        // Guests should not have a points system
        if (isGuest) {
            throw new Error("Guests do not have a points system");
        }

        if (points < pointsToRedeem) {
            throw new Error("Insufficient points");
        }

        try {
            const userId = currentUser.uid;
            const pointsRef = doc(db, "points", userId);
            const newBalance = points - pointsToRedeem;

            // Update points balance
            await setDoc(
                pointsRef,
                {
                    balance: newBalance,
                    userId,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            let couponCode = null;
            let walletUpdated = false;

            // Option 1: Add discount to wallet balance
            if (redemptionType === "wallet" || redemptionType === "both") {
                try {
                    const walletRef = doc(db, "wallets", userId);
                    const walletSnap = await getDoc(walletRef);
                    
                    let currentBalance = 0;
                    if (walletSnap.exists()) {
                        currentBalance = walletSnap.data().balance || 0;
                    }

                    const newWalletBalance = currentBalance + Number(discountAmount);
                    
                    await setDoc(
                        walletRef,
                        {
                            balance: newWalletBalance,
                            currency: "PHP",
                            updatedAt: serverTimestamp(),
                        },
                        { merge: true }
                    );

                    // Record wallet top-up transaction
                    await addDoc(collection(db, "transactions"), {
                        userId,
                        type: "topup",
                        amount: Number(discountAmount),
                        balanceBefore: currentBalance,
                        balanceAfter: newWalletBalance,
                        currency: "PHP",
                        status: "completed",
                        description: `Points redemption: ${pointsToRedeem} points = ₱${discountAmount}`,
                        source: "points_redemption",
                        createdAt: serverTimestamp(),
                    });

                    walletUpdated = true;
                } catch (walletError) {
                    console.error("Error adding to wallet:", walletError);
                    // Don't fail redemption if wallet update fails
                }
            }

            // Option 2: Generate coupon code
            if (redemptionType === "coupon" || redemptionType === "both") {
                try {
                    // Generate unique coupon code
                    const generateCouponCode = () => {
                        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                        let code = "POINTS-";
                        for (let i = 0; i < 8; i++) {
                            code += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        return code;
                    };

                    let uniqueCode = generateCouponCode();
                    // Ensure code is unique
                    let codeExists = true;
                    let attempts = 0;
                    while (codeExists && attempts < 10) {
                        const q = query(collection(db, "coupons"), where("code", "==", uniqueCode));
                        const snap = await getDocs(q);
                        if (snap.empty) {
                            codeExists = false;
                        } else {
                            uniqueCode = generateCouponCode();
                            attempts++;
                        }
                    }

                    if (!codeExists) {
                        couponCode = uniqueCode;

                        // Set expiration date (90 days from now)
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 90);

                        // Create coupon document
                        await addDoc(collection(db, "coupons"), {
                            code: couponCode,
                            userId: userId,
                            type: "fixed",
                            value: Number(discountAmount),
                            maxDiscount: null,
                            description: `Redeemed from ${pointsToRedeem.toLocaleString()} points`,
                            startDate: serverTimestamp(),
                            endDate: expiresAt,
                            status: "active",
                            createdBy: "points_redemption",
                            pointsRedeemed: pointsToRedeem,
                            usedBy: [],
                            createdAt: serverTimestamp(),
                        });
                    }
                } catch (couponError) {
                    console.error("Error creating coupon:", couponError);
                    // Don't fail redemption if coupon creation fails
                }
            }

            // Record points transaction
            await addDoc(collection(db, "pointsTransactions"), {
                userId,
                type: "redemption",
                amount: -pointsToRedeem,
                balanceBefore: points,
                balanceAfter: newBalance,
                description,
                discountAmount,
                couponCode: couponCode || null,
                walletUpdated: walletUpdated,
                redemptionType: redemptionType,
                createdAt: serverTimestamp(),
            });

            setPoints(newBalance);
            return { 
                success: true, 
                newBalance, 
                discountAmount,
                couponCode: couponCode || null,
                walletUpdated: walletUpdated
            };
        } catch (error) {
            console.error("Error redeeming points:", error);
            throw error;
        }
    }, [currentUser, points, isGuest]);

    const getPointsHistory = useCallback(async (limitCount = 50) => {
        if (!currentUser || isGuest) return [];

        try {
            const q = query(
                collection(db, "pointsTransactions"),
                where("userId", "==", currentUser.uid),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
            const snap = await getDocs(q);
            return snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        } catch (error) {
            console.error("Error loading points history:", error);
            return [];
        }
    }, [currentUser, isGuest]);

    const getConversionRate = useCallback(() => {
        // Default: 100 points = ₱10 discount
        // This can be made configurable by admin
        return {
            pointsToPeso: 100, // 100 points = 1 peso
            pesoToPoints: 10, // 10 pesos = 1 point
        };
    }, []);

    const convertPointsToDiscount = useCallback((pointsAmount) => {
        const rate = getConversionRate();
        return (pointsAmount / rate.pointsToPeso).toFixed(2);
    }, [getConversionRate]);

    // Refresh points from Firestore
    const refreshPoints = useCallback(async () => {
        if (!currentUser) return;
        const guestStatus = await checkUserRole(currentUser.uid);
        if (!guestStatus) {
            await loadPoints(currentUser.uid);
        }
    }, [currentUser, checkUserRole, loadPoints]);

    return (
        <PointsContext.Provider
            value={{
                points,
                loading,
                awardPoints,
                redeemPoints,
                getPointsHistory,
                getConversionRate,
                convertPointsToDiscount,
                refreshPoints,
            }}
        >
            {children}
        </PointsContext.Provider>
    );
}

export function usePoints() {
    const context = useContext(PointsContext);
    if (!context) {
        throw new Error("usePoints must be used within PointsProvider");
    }
    return context;
}

