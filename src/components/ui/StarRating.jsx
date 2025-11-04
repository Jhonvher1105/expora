import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({ rating, setRating, readonly = false, size = 24 }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating);
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && setRating(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            style={{
              background: "none",
              border: "none",
              cursor: readonly ? "default" : "pointer",
              padding: 0,
              outline: "none"
            }}
          >
            <Star
              size={size}
              fill={isFilled ? "#fbbf24" : "none"}
              color={isFilled ? "#fbbf24" : "#d1d5db"}
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span style={{ marginLeft: "8px", fontSize: "14px", color: "#666" }}>
          {rating.toFixed(1)} / 5.0
        </span>
      )}
    </div>
  );
}

