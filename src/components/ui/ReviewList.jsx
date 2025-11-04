import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import StarRating from "./StarRating";
import { ThumbsUp, Flag } from "lucide-react";

export default function ReviewList({ listingId, showAll = false }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, highest, lowest
  const [userNames, setUserNames] = useState({});

  useEffect(() => {
    loadReviews();
  }, [listingId, filter, sortBy]);

  useEffect(() => {
    loadUserNames();
  }, [reviews]);

  const loadUserNames = async () => {
    const userIds = [...new Set(reviews.map(r => r.userId))];
    const names = {};
    
    for (const userId of userIds) {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          names[userId] = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Anonymous";
        } else {
          names[userId] = "Anonymous";
        }
      } catch (error) {
        names[userId] = "Anonymous";
      }
    }
    
    setUserNames(names);
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsRef = collection(db, "reviews");
      
      // Only query by listingId to avoid index requirements
      // We'll filter and sort in memory
      let q = query(
        reviewsRef, 
        where("listingId", "==", listingId),
        orderBy("createdAt", "desc") // This requires an index on listingId + createdAt
      );

      // Try to get all reviews, then filter/sort in memory if index doesn't exist
      try {
        const snap = await getDocs(q);
        let reviewsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Apply rating filter in memory
        if (filter !== "all") {
          reviewsData = reviewsData.filter(review => review.rating === Number(filter));
        }

        // Apply sorting in memory (if different from createdAt desc)
        if (sortBy === "oldest") {
          reviewsData = reviewsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return aDate - bDate;
          });
        } else if (sortBy === "highest") {
          reviewsData = reviewsData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === "lowest") {
          reviewsData = reviewsData.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        }
        // "newest" is already sorted by createdAt desc from query

        // Limit if not showing all
        if (!showAll) {
          reviewsData = reviewsData.slice(0, 5);
        }

        setReviews(reviewsData);
      } catch (indexError) {
        // If index doesn't exist, fetch without orderBy and do everything in memory
        console.warn("Index not found, fetching all reviews and sorting in memory:", indexError);
        
        const simpleQuery = query(reviewsRef, where("listingId", "==", listingId));
        const snap = await getDocs(simpleQuery);
        let reviewsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Apply rating filter in memory
        if (filter !== "all") {
          reviewsData = reviewsData.filter(review => review.rating === Number(filter));
        }

        // Apply sorting in memory
        if (sortBy === "newest") {
          reviewsData = reviewsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate - aDate;
          });
        } else if (sortBy === "oldest") {
          reviewsData = reviewsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return aDate - bDate;
          });
        } else if (sortBy === "highest") {
          reviewsData = reviewsData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === "lowest") {
          reviewsData = reviewsData.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        }

        // Limit if not showing all
        if (!showAll) {
          reviewsData = reviewsData.slice(0, 5);
        }

        setReviews(reviewsData);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      setReviews([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return sum / reviews.length;
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = Math.round(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });
    return distribution;
  };

  if (loading) {
    return <div>Loading reviews...</div>;
  }

  const avgRating = calculateAverageRating();
  const distribution = getRatingDistribution();

  return (
    <div>
      {/* Rating Summary */}
      <div style={{
        display: "flex",
        gap: "32px",
        marginBottom: "24px",
        padding: "20px",
        background: "#f8f9fa",
        borderRadius: "8px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: "#333" }}>
            {avgRating.toFixed(1)}
          </div>
          <StarRating rating={Math.round(avgRating)} setRating={() => {}} readonly={true} size={20} />
          <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </div>
        </div>

        {/* Rating Distribution */}
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star];
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "60px", textAlign: "right", fontSize: "14px" }}>{star} ⭐</div>
                <div style={{ flex: 1, height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    background: "#fbbf24",
                    width: `${percentage}%`,
                    transition: "width 0.3s"
                  }} />
                </div>
                <div style={{ width: "40px", textAlign: "left", fontSize: "14px", color: "#666" }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: "16px",
        marginBottom: "20px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div>
          <label style={{ marginRight: "8px", fontSize: "14px" }}>Filter by Rating:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: "8px", fontSize: "14px" }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "6px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div style={{ display: "grid", gap: "16px" }}>
        {reviews.length === 0 ? (
          <div style={{
            padding: "40px",
            textAlign: "center",
            color: "#666",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            No reviews yet. Be the first to review!
          </div>
        ) : (
          reviews.map((review) => {
            const date = review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt);
            return (
              <div
                key={review.id}
                style={{
                  padding: "20px",
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                      {userNames[review.userId] || "Anonymous"}
                    </div>
                    <StarRating rating={review.rating} setRating={() => {}} readonly={true} size={16} />
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {date.toLocaleDateString()}
                  </div>
                </div>
                <div style={{ color: "#333", lineHeight: "1.6", marginBottom: "12px" }}>
                  {review.comment}
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#666" }}>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px"
                    }}
                    onClick={() => {
                      // TODO: Implement helpful functionality
                      alert("Helpful feature coming soon!");
                    }}
                  >
                    <ThumbsUp size={14} />
                    Helpful ({review.helpful || 0})
                  </button>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px"
                    }}
                    onClick={() => {
                      // TODO: Implement report functionality
                      alert("Report feature coming soon!");
                    }}
                  >
                    <Flag size={14} />
                    Report
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

