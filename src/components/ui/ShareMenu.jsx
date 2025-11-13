import { Copy, Facebook, Twitter, Instagram } from "lucide-react";

function ShareMenu({ 
    listingId, 
    onCopyLink, 
    onShareSocial, 
    position = { right: 0, top: 40 } 
}) {
    return (
        <div style={{
            position: "absolute",
            right: position.right,
            top: position.top,
            background: "var(--bg-modal, rgba(15, 15, 30, 0.95))",
            border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
            borderRadius: "var(--radius-md, 8px)",
            padding: "8px",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            minWidth: 180,
            backdropFilter: "blur(10px)"
        }}>
            <button
                onClick={() => onCopyLink(listingId)}
                style={{ 
                    width: "100%", 
                    padding: "8px", 
                    textAlign: "left", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    border: "none", 
                    background: "transparent", 
                    cursor: "pointer",
                    color: "var(--text, #ffffff)",
                    borderRadius: "var(--radius-sm, 4px)",
                    transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
                <Copy size={16} /> Copy Link
            </button>
            <button
                onClick={() => onShareSocial("facebook", listingId)}
                style={{ 
                    width: "100%", 
                    padding: "8px", 
                    textAlign: "left", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    border: "none", 
                    background: "transparent", 
                    cursor: "pointer",
                    color: "var(--text, #ffffff)",
                    borderRadius: "var(--radius-sm, 4px)",
                    transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
                <Facebook size={16} /> Facebook
            </button>
            <button
                onClick={() => onShareSocial("twitter", listingId)}
                style={{ 
                    width: "100%", 
                    padding: "8px", 
                    textAlign: "left", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    border: "none", 
                    background: "transparent", 
                    cursor: "pointer",
                    color: "var(--text, #ffffff)",
                    borderRadius: "var(--radius-sm, 4px)",
                    transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
                <Twitter size={16} /> Twitter
            </button>
            <button
                onClick={() => onShareSocial("instagram", listingId)}
                style={{ 
                    width: "100%", 
                    padding: "8px", 
                    textAlign: "left", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    border: "none", 
                    background: "transparent", 
                    cursor: "pointer",
                    color: "var(--text, #ffffff)",
                    borderRadius: "var(--radius-sm, 4px)",
                    transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.background = "var(--bg-surface, rgba(255, 255, 255, 0.05))"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
                <Instagram size={16} /> Instagram
            </button>
        </div>
    );
}

export default ShareMenu;

