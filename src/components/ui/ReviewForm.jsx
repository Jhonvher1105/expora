import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import StarRating from "./StarRating";
import { X } from "lucide-react";

export default function ReviewForm({ listingId, bookingId, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError("Please provide a rating");
      return;
    }

    if (comment.trim().length < 10) {
      setError("Please provide a detailed comment (at least 10 characters)");
      return;
    }

    if (!auth.currentUser) {
      setError("You must be logged in to submit a review");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await addDoc(collection(db, "reviews"), {
        listingId,
        bookingId,
        userId: auth.currentUser.uid,
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        helpful: 0,
        reported: false
      });

      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
      alert("Review submitted successfully! Thank you for your feedback.");
    } catch (error) {
      console.error("Error submitting review:", error);
      setError("Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "var(--bg-modal, rgba(15, 15, 30, 0.95))",
        padding: "24px",
        borderRadius: "var(--radius-lg, 12px)",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6)",
        border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
        color: "var(--text, #ffffff)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "var(--text, #ffffff)" }}>Write a Review</h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                borderRadius: "var(--radius-md, 8px)",
                cursor: "pointer",
                padding: "8px",
                color: "var(--text, #ffffff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text, #ffffff)" }}>
              Your Rating *
            </label>
            <StarRating rating={rating} setRating={setRating} />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text, #ffffff)" }}>
              Your Review *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience... (minimum 10 characters)"
              rows={6}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                borderRadius: "var(--radius-md, 8px)",
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical",
                background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                color: "var(--text, #ffffff)",
                outline: "none",
                transition: "border-color 0.2s, background 0.2s"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary, #ff6b35)";
                e.target.style.background = "var(--bg-surface-hover, rgba(255, 255, 255, 0.08))";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border, rgba(255, 255, 255, 0.1))";
                e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))";
              }}
              required
            />
            <div style={{ fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "4px" }}>
              {comment.length} characters
            </div>
          </div>

          {error && (
            <div style={{
              padding: "12px",
              background: "rgba(239, 68, 68, 0.2)",
              color: "var(--error, #ef4444)",
              borderRadius: "var(--radius-md, 8px)",
              marginBottom: "16px",
              border: "1px solid rgba(239, 68, 68, 0.3)"
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  background: "var(--bg-surface, rgba(255, 255, 255, 0.05))",
                  color: "var(--text, #ffffff)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                  borderRadius: "var(--radius-md, 8px)",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--bg-surface-hover, rgba(255, 255, 255, 0.08))";
                  e.target.style.borderColor = "var(--border-strong, rgba(255, 255, 255, 0.2))";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))";
                  e.target.style.borderColor = "var(--border, rgba(255, 255, 255, 0.1))";
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || rating === 0 || comment.trim().length < 10}
              style={{
                padding: "10px 20px",
                background: loading || rating === 0 || comment.trim().length < 10 
                  ? "rgba(255, 255, 255, 0.1)" 
                  : "var(--primary-gradient, linear-gradient(135deg, #ff6b35 0%, #f7931e 100%))",
                color: "var(--text, #ffffff)",
                border: "none",
                borderRadius: "var(--radius-md, 8px)",
                cursor: loading || rating === 0 || comment.trim().length < 10 ? "not-allowed" : "pointer",
                fontWeight: "600",
                boxShadow: loading || rating === 0 || comment.trim().length < 10 
                  ? "none" 
                  : "0 4px 12px rgba(255, 107, 53, 0.3)",
                transition: "all 0.2s ease",
                opacity: loading || rating === 0 || comment.trim().length < 10 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && rating > 0 && comment.trim().length >= 10) {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 6px 16px rgba(255, 107, 53, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && rating > 0 && comment.trim().length >= 10) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 12px rgba(255, 107, 53, 0.3)";
                }
              }}
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

