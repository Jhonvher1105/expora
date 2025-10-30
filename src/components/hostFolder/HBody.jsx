import Header from "./Hheader"
import Footer from "../generalFile/Footer";
import { useState, useEffect } from "react";
import { MessageCircleMore, Heart, MapPin, Star, Plus, X } from "lucide-react";

import plus from "../pic/icon/plus.svg"

import '../../components/cssFile/temp.css';

import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

import AddProperty from "../ui/AddProperty";

export default function HostBoy() {

    const [activeTab, setActiveTab] = useState("discover");
    const [selectedDest, setSelectedDest] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeFIlter, setActiveFilter] = useState();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHostForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchProperties = async () => {
            if (!currentUser) return; // wait until user is loaded
            try {
                const q = query(
                    collection(db, "properties"),
                    where("ownerId", "==", currentUser.uid)
                );

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
    }, [currentUser]); // depend on currentUser


    return <>
        <Header />
        <div role="body" className="host_Body">
            <h1>Dashboard</h1>
            <main>
                <article>
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === "discover" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("discover")}
                        >
                            Home
                        </button>
                        <button
                            className={`tab ${activeTab === "Services" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("Service")}
                        >
                            Services
                        </button>
                        <button
                            className={`tab ${activeTab === "Experiences" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("Experiences")}
                        >
                            Experiences
                        </button>
                    </div>
                    <div className="filter-day">
                        <button className="today">
                            Today
                        </button>
                        <button className="upcoming">
                            UpComings
                        </button>
                    </div>
                </article>
                <article>
                    {activeTab === "discover" && (
                        <section className="section">
                            <div className="section-header">
                                <h2 className="section-title">
                                    Home
                                </h2>
                                <a href="#" className="see-all">
                                    See all
                                </a>
                            </div>

                            <div className="destinations-grid">
                                {properties.length > 0 ? (
                                    properties.map((property) => (
                                        <div
                                            key={property.id}
                                            className="destination-card"
                                            
                                            role="button"
                                            tabIndex={0}>
                                            <div className="destination-image">
                                                {property.images && property.images.length > 0 ? (
                                                    <img
                                                        src={property.images[0]}
                                                        alt={property.title}
                                                        className="property-img"
                                                    // style={{
                                                    //     width: "100%",
                                                    //     height: "180px",
                                                    //     objectFit: "cover",
                                                    //     borderRadius: "8px",
                                                    // }}
                                                    />
                                                ) : (
                                                    <div className="no-image">No Image</div>
                                                )}
                                                <button
                                                    className="favorite-btn"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Heart size={20} />
                                                </button>
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
                                                    <div className="edit_del_Btn_container">

                                                    <div className="edit_del_Btn_grp">
                                                    <button
                                                        className="explore-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDest(property);
                                                            setShowDetail(true);
                                                        }}
                                                        >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="del-property-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDest(property);
                                                            setShowDetail(true);
                                                        }}
                                                        >
                                                        Delete
                                                    </button>
                                                        </div>
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

                    {/* add property */}
                    {showHostForm && (
                        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add property form">
                            <div className="modal host-modal" onClick={e => e.stopPropagation()}>
                                <AddProperty
                                    onClose={() => setShowForm(false)}
                                    onPropertyCreated={(data) => {
                                        console.log('Property created:', data);
                                        setShowForm(false);
                                        // You can add a success notification here
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </article>

            </main>
            <div className="floater-container">
                <button className="icon-btn"
                    aria-label="Add" onClick={() => setShowForm(true)}>
                    <Plus size={20} />
                </button>
                <button className="icon-btn"
                    aria-label="Chat"
                >
                    <MessageCircleMore size={20} />
                    <span className="notification-badge" aria-hidden="true">
                    </span>
                </button>
            </div>
        </div>
        {showDetail && selectedDest && (
                    <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="modal-close"
                                onClick={() => setShowDetail(false)}
                                aria-label="Close detail"
                            >
                                <X />
                            </button>

                            <div className="modal-content">
                                {selectedDest.images && selectedDest.images.length > 0 && (
                                    <img
                                        src={selectedDest.images[0]}
                                        alt={selectedDest.title}
                                        className="w-60 h-60 object-cover rounded-xl"
                                    />
                                )}

                                <div className="modal-body">
                                    <h2 className="modal-title">
                                        {selectedDest.title}{" "}
                                        <span className="modal-price">
                                            ₱{selectedDest.price?.toLocaleString()} / night
                                        </span>
                                    </h2>
                                    <p className="modal-location">
                                        <MapPin size={14} /> {selectedDest.location}
                                    </p>
                                    <p className="modal-description">{selectedDest.description}</p>

                                    <div className="modal-actions">
                                        <button className="book-btn">Book Now</button>
                                        <button className="close-btn" onClick={() => setShowDetail(false)}>
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        <Footer role="footer" />
    </>
}