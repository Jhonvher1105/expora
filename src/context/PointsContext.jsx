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

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                loadPoints(user.uid);
            } else {
                setPoints(0);
                setLoading(false);
            }
        });
        return unsub;
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
                // Initialize points if doesn't exist
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

    const awardPoints = useCallback(async (amount, type, description, bookingId = null) => {
        if (!currentUser || amount <= 0) {
            throw new Error("Invalid amount or user");
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
            return { success: true, newBalance, pointsAwarded: amount };
        } catch (error) {
            console.error("Error awarding points:", error);
            throw error;
        }
    }, [currentUser]);

    const redeemPoints = useCallback(async (pointsToRedeem, discountAmount, description) => {
        if (!currentUser || pointsToRedeem <= 0) {
            throw new Error("Invalid redemption amount");
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

            // Record transaction
            await addDoc(collection(db, "pointsTransactions"), {
                userId,
                type: "redemption",
                amount: -pointsToRedeem,
                balanceBefore: points,
                balanceAfter: newBalance,
                description,
                discountAmount,
                createdAt: serverTimestamp(),
            });

            setPoints(newBalance);
            return { success: true, newBalance, discountAmount };
        } catch (error) {
            console.error("Error redeeming points:", error);
            throw error;
        }
    }, [currentUser, points]);

    const getPointsHistory = useCallback(async (limitCount = 50) => {
        if (!currentUser) return [];

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
    }, [currentUser]);

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

