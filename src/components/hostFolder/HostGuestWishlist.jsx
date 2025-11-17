import { useState, useEffect } from "react";
import { Bookmark, User, Mail, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import "../cssFile/temp.css";
import Header from "./Hheader";
import Footer from "../generalFile/Footer";
import {
    collection,
    getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function HostGuestWishlist() {
    const [currentUser, setCurrentUser] = useState(null);
    const [guestWishlists, setGuestWishlists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGuest, setSelectedGuest] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch all guests with wishlist preferences
    useEffect(() => {
        const fetchGuestWishlists = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch all users
                const usersRef = collection(db, "users");
                const usersSnap = await getDocs(usersRef);
                
                // Debug: Log all users to see what we're getting
                const allUsers = usersSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                console.log("All users fetched:", allUsers.length);
                console.log("Users with wishlistPreferences:", allUsers.filter(u => u.wishlistPreferences));
                
                // Filter users who have wishlistPreferences
                // Show all users with preferences (guests, hosts without host role set, or users with no role)
                const guestsWithPreferences = allUsers
                    .filter((user) => {
                        // Check if user has saved preferences
                        const hasPreferences = user.wishlistPreferences && user.wishlistPreferences.trim().length > 0;
                        
                        if (!hasPreferences) {
                            console.log(`User ${user.id} (${user.email}) filtered out: no preferences`);
                            return false;
                        }
                        
                        // Exclude admins, but include guests, hosts (they can have preferences too), and users with no role set
                        const role = user.role || user.accType;
                        const isAdmin = role === "admin";
                        
                        if (isAdmin) {
                            console.log(`User ${user.id} (${user.email}) filtered out: is admin`);
                            return false;
                        }
                        
                        console.log(`User ${user.id} (${user.email}) included - role: ${role || 'none'}, preferences: ${user.wishlistPreferences.substring(0, 50)}...`);
                        // Show all non-admin users with preferences
                        return true;
                    });

                console.log("Final filtered count:", guestsWithPreferences.length);
                setGuestWishlists(guestsWithPreferences);
            } catch (error) {
                console.error("Error fetching guest wishlists:", error);
                alert("Error loading guest wishlists. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };

        fetchGuestWishlists();
    }, [currentUser]);

    // Filter guests by search query
    const filteredGuests = guestWishlists.filter((guest) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const fullName = `${guest.firstName || ""} ${guest.lastName || ""}`.toLowerCase();
        const email = guest.email?.toLowerCase() || "";
        const preferences = guest.wishlistPreferences?.toLowerCase() || "";
        
        return (
            fullName.includes(query) ||
            email.includes(query) ||
            preferences.includes(query)
        );
    });

    if (!currentUser) {
        return (
            <>
                <Header />
                <div className="profile-container" style={{ paddingTop: "120px", textAlign: "center" }}>
                    <h2>Please log in to view guest wishlists</h2>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="profile-container" style={{ paddingTop: "120px" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
                    <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1.5rem", color: "var(--text)" }}>
                        <Bookmark size={28} style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }} />
                        Guest Wishlists
                    </h1>
                    <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
                        View preferences and interests that guests have shared in their wishlists
                    </p>

                    {/* Search Bar */}
                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ position: "relative", maxWidth: "500px" }}>
                            <Search size={20} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                            <input
                                type="text"
                                placeholder="Search by guest name, email, or preferences..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem 0.75rem 3rem",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    fontSize: "1rem",
                                    backgroundColor: "var(--bg)",
                                    color: "var(--text)",
                                }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "3rem" }}>
                            <p>Loading guest wishlists...</p>
                        </div>
                    ) : filteredGuests.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem" }}>
                            <Bookmark size={64} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                            <h3>No guest wishlists found</h3>
                            <p style={{ color: "var(--text-muted)" }}>
                                {searchQuery ? "No guests match your search." : "No guests have saved their wishlist preferences yet."}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
                            {filteredGuests.map((guest) => {
                                const guestName = guest.firstName && guest.lastName
                                    ? `${guest.firstName} ${guest.lastName}`
                                    : guest.email?.split('@')[0] || "Guest";

                                return (
                                    <div
                                        key={guest.id}
                                        style={{
                                            border: "1px solid var(--border)",
                                            borderRadius: "12px",
                                            padding: "1.5rem",
                                            backgroundColor: "var(--card-bg)",
                                            cursor: "pointer",
                                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "none";
                                        }}
                                        onClick={() => setSelectedGuest(guest)}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                            <div style={{ 
                                                display: "flex", 
                                                alignItems: "center", 
                                                justifyContent: "center", 
                                                width: "48px", 
                                                height: "48px", 
                                                borderRadius: "50%", 
                                                backgroundColor: "var(--primary)", 
                                                color: "white",
                                                flexShrink: 0
                                            }}>
                                                <User size={24} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ 
                                                    fontSize: "1.1rem", 
                                                    fontWeight: 600, 
                                                    marginBottom: "0.25rem", 
                                                    color: "var(--text)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    {guestName}
                                                </h3>
                                                {guest.email && (
                                                    <p style={{ 
                                                        fontSize: "0.875rem", 
                                                        color: "var(--text-muted)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}>
                                                        <Mail size={14} />
                                                        {guest.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{
                                            padding: "1rem",
                                            backgroundColor: "var(--bg)",
                                            borderRadius: "8px",
                                            border: "1px solid var(--border)",
                                            minHeight: "100px",
                                            maxHeight: "150px",
                                            overflow: "hidden",
                                            position: "relative"
                                        }}>
                                            <p style={{ 
                                                fontSize: "0.9rem", 
                                                color: "var(--text)",
                                                lineHeight: "1.5",
                                                margin: 0,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 4,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden"
                                            }}>
                                                {guest.wishlistPreferences || "No preferences saved"}
                                            </p>
                                        </div>
                                        
                                        <p style={{ 
                                            fontSize: "0.75rem", 
                                            color: "var(--text-muted)", 
                                            marginTop: "0.75rem",
                                            textAlign: "right"
                                        }}>
                                            Click to view full preferences
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal to show full guest preferences */}
            {selectedGuest && createPortal(
                <div 
                    className="modal-overlay logout-modal-overlay" 
                    onClick={() => setSelectedGuest(null)}
                >
                    <div className="modal logout-modal wishlist-modal" onClick={e => e.stopPropagation()}>
                        <div className="logout-modal-content">
                            <div className="wishlist-modal-header">
                                <div className="logout-modal-icon" style={{ marginBottom: "0" }}>
                                    <Bookmark size={48} />
                                </div>
                                <button
                                    className="wishlist-modal-close-btn"
                                    onClick={() => setSelectedGuest(null)}
                                    aria-label="Close modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div style={{ marginBottom: "1.5rem", width: "100%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                                    <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        width: "48px", 
                                        height: "48px", 
                                        borderRadius: "50%", 
                                        backgroundColor: "var(--primary)", 
                                        color: "white",
                                        flexShrink: 0
                                    }}>
                                        <User size={24} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.25rem" }}>
                                            {selectedGuest.firstName && selectedGuest.lastName
                                                ? `${selectedGuest.firstName} ${selectedGuest.lastName}`
                                                : selectedGuest.email?.split('@')[0] || "Guest"}
                                        </h3>
                                        {selectedGuest.email && (
                                            <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <Mail size={14} />
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {selectedGuest.email}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h3 className="logout-modal-title">What do you like?</h3>
                            <p className="logout-modal-message" style={{ marginBottom: "20px" }}>
                                Tell us about your preferences, interests, or things you'd like to add to your wishlist. 
                                This helps us personalize your experience!
                            </p>
                            
                            <div
                                className="wishlist-modal-textarea"
                                style={{
                                    whiteSpace: "pre-wrap",
                                    wordWrap: "break-word",
                                    overflowY: "auto",
                                    maxHeight: "300px",
                                    cursor: "default",
                                    resize: "none"
                                }}
                            >
                                {selectedGuest.wishlistPreferences || "No preferences saved"}
                            </div>
                            
                            <div className="logout-modal-buttons" style={{ display: "flex", gap: "12px" }}>
                                <button 
                                    className="logout-cancel-btn"
                                    onClick={() => setSelectedGuest(null)}
                                    style={{ flex: 1 }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <Footer />
        </>
    );
}

export default HostGuestWishlist;
