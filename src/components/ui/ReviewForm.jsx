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
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "8px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>Write a Review</h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={24} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Your Rating *
            </label>
            <StarRating rating={rating} setRating={setRating} />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
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
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical"
              }}
              required
            />
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              {comment.length} characters
            </div>
          </div>

          {error && (
            <div style={{
              padding: "12px",
              background: "#f8d7da",
              color: "#721c24",
              borderRadius: "4px",
              marginBottom: "16px"
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
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
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
                background: loading || rating === 0 || comment.trim().length < 10 ? "#ccc" : "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: loading || rating === 0 || comment.trim().length < 10 ? "not-allowed" : "pointer",
                fontWeight: "bold"
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

