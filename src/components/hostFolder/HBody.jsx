import Header from "./Hheader";
import Footer from "../generalFile/Footer";
import { useState, useEffect } from "react";
import { MessageCircleMore, Heart, MapPin, Star, Plus, X } from "lucide-react";
import "../../components/cssFile/temp.css";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import AddProperty from "../ui/AddProperty";
import HostingType from "../ui/HostingType";
import { collection as fbCollection, getDocs as fbGetDocs, query as fbQuery, where as fbWhere } from "firebase/firestore";

export default function HostBody() {
    const [activeTab, setActiveTab] = useState("properties");
    const [selectedDest, setSelectedDest] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHostForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [todayBookings, setTodayBookings] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);

    // Load current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch user properties
    useEffect(() => {
        const fetchProperties = async () => {
            console.log(activeTab + " running fetchProperties")
            if (!currentUser) return;
            setLoading(true);
            try {
                const q = query(collection(db, activeTab), where("ownerId", "==", currentUser.uid));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProperties(data);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [currentUser, activeTab]);

    // Fetch bookings for this host (today and upcoming)
    useEffect(() => {
        const loadBookings = async () => {
            if (!currentUser) return;
            try {
                const q = fbQuery(fbCollection(db, "bookings"), fbWhere("hostId", "==", currentUser.uid));
                const snap = await fbGetDocs(q);
                const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                const today = [];
                const upcoming = [];
                const todayDate = new Date();
                const startOfToday = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime();
                const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
                all.forEach((b) => {
                    const start = new Date(b.startDate).getTime();
                    if (start >= startOfToday && start <= endOfToday) today.push(b);
                    else if (start > endOfToday) upcoming.push(b);
                });
                setTodayBookings(today.sort((a,b)=> new Date(a.startDate)-new Date(b.startDate)));
                setUpcomingBookings(upcoming.sort((a,b)=> new Date(a.startDate)-new Date(b.startDate)));
            } catch (e) {
                console.error(e);
            }
        };
        loadBookings();
    }, [currentUser]);


    // ✅ Safe delete: Firestore only (no Cloudinary deletion)
    const handleDelete = async (property) => {
        if (!window.confirm("Are you sure you want to delete this property?")) return;

        try {
            // 1. Delete Firestore document
            await deleteDoc(doc(db, "properties", property.id));

            // 2. Update UI instantly
            setProperties((prev) => prev.filter((p) => p.id !== property.id));

            alert("Property deleted successfully! (Images remain in Cloudinary for safety)");
        } catch (error) {
            console.error("Error deleting property:", error);
            alert("Failed to delete property. Please try again.");
        }
    };

    // ✅ Handle editing and saving changes
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const propertyRef = doc(db, "properties", selectedDest.id);
            await updateDoc(propertyRef, {
                title: selectedDest.title,
                location: selectedDest.location,
                price: selectedDest.price,
                description: selectedDest.description,
            });

            setProperties((prev) =>
                prev.map((p) => (p.id === selectedDest.id ? { ...p, ...selectedDest } : p))
            );

            setShowEditForm(false);
            alert("Property updated successfully!");
        } catch (error) {
            console.error("Error updating property:", error);
            alert("Failed to update property.");
        }
    };

    return (
        <>
            <Header />
            <div role="body" className="host_Body">
                <h1>Dashboard</h1>

                <main>
                    <article>
                        <div className="tabs">
                            <button
                                className={`tab ${activeTab === "properties" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("properties");
                                    console.log("Properties tab clicked");
                                }}
                            >
                                Home
                            </button>
                            <button
                                className={`tab ${activeTab === "services" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("services")
                                    console.log("Service tab clicked");
                                }}
                            >
                                Services
                            </button>
                            <button
                                className={`tab ${activeTab === "experiences" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("experiences")
                                    console.log("Experiences tab clicked");
                                }}
                            >
                                Experiences
                            </button>
                        </div>
                    </article>

                    <article>
                        {activeTab && (
                            <section className="section">
                                <div className="destinations-grid">
                                    {properties.length > 0 ? (
                                        properties.map((property) => (
                                            <div key={property.id} className="destination-card">
                                                <div className="destination-image">
                                                    {property.images && property.images.length > 0 ? (
                                                        <img
                                                            src={property.images[0]}
                                                            alt={property.title}
                                                            className="property-img"
                                                        />
                                                    ) : (
                                                        <div className="no-image">No Image</div>
                                                    )}
                                                </div>

                                                <div className="destination-content">
                                                    <div className="destination-header">
                                                        <h3 className="destination-name">{property.title}</h3>
                                                        <span className="destination-price">
                                                            ₱{property.price?.toLocaleString()} / night
                                                        </span>
                                                    </div>

                                                    <p className="destination-location">
                                                        <MapPin size={14} /> {property.location}
                                                    </p>

                                                    <div className="destination-footer">
                                                        <div className="rating">
                                                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                                                            <span>4.8</span>
                                                        </div>

                                                        <div className="edit_del_Btn_grp">
                                                            <button
                                                                className="explore-btn"
                                                                onClick={() => {
                                                                    setSelectedDest(property);
                                                                    setShowEditForm(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="del-property-btn"
                                                                onClick={() => handleDelete(property)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center mt-5 text-gray-500">No properties found.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Add Property Modal */}
                        {showHostForm && (
                            <div className="modal-overlay">
                                <div className="modal host-modal" onClick={(e) => e.stopPropagation()}>
                                    <HostingType
                                        onClose={() => setShowForm(false)}
                                    />

                                </div>
                            </div>
                        )}

                        {/* Edit Modal */}
                        {showEditForm && selectedDest && (
                            <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
                                <div className="modal" onClick={(e) => e.stopPropagation()}>
                                    <button className="modal-close" onClick={() => setShowEditForm(false)}>
                                        <X />
                                    </button>
                                    <h2>Edit Property</h2>

                                    <form onSubmit={handleEditSubmit} className="edit-form">
                                        <label>
                                            Title:
                                            <input
                                                type="text"
                                                value={selectedDest.title}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, title: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Location:
                                            <input
                                                type="text"
                                                value={selectedDest.location}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, location: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Price:
                                            <input
                                                type="number"
                                                value={selectedDest.price}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, price: parseFloat(e.target.value) })
                                                }
                                                required
                                            />
                                        </label>

                                        <label>
                                            Description:
                                            <textarea
                                                value={selectedDest.description}
                                                onChange={(e) =>
                                                    setSelectedDest({ ...selectedDest, description: e.target.value })
                                                }
                                                required
                                            />
                                        </label>

                                        <div className="modal-actions">
                                            <button type="submit" className="book-btn">
                                                Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                className="close-btn"
                                                onClick={() => setShowEditForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </article>
                </main>

                <div className="floater-container">
                    <button className="icon-btn" onClick={() => setShowForm(true)}>
                        <Plus size={20} />
                    </button>
                    <button className="icon-btn">
                        <MessageCircleMore size={20} />
                    </button>
                </div>
            </div>
            <Footer />
        </>
    );
}
