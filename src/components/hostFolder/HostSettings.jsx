import { User, Calendar, Wallet, TrendingUp, TrendingDown, Filter, MapPin, DollarSign, X, CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase";
import { 
    onAuthStateChanged
} from "firebase/auth";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { useWallet } from "../../context/WalletContext";

import Header from './Hheader';
import Footer from '../generalFile/Footer';

import '../cssFile/temp.css';

// Cloudinary configuration
const CLOUD_NAME = "dv42rw8m7";
const UPLOAD_PRESET = "unsigned_preset";

export default function HostSettings() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("profile"); // "profile", "bookings", "earnings"

    // Profile state
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        email: "",
        firstName: "",
        middleName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        phoneNumber: "",
        city: "",
        state: "",
        zipCode: "",
        houseNumber: ""
    });
    const [showProfileSave, setShowProfileSave] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(true);
    const [originalFormData, setOriginalFormData] = useState(null);

    // Bookings state
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("all");
    const [guestInfo, setGuestInfo] = useState({});

    // Earnings state
    const { balance } = useWallet();
    const [earningsActiveTab, setEarningsActiveTab] = useState("overview");
    const [earningsLoading, setEarningsLoading] = useState(true);
    const [earnings, setEarnings] = useState(0);
    const [pendingEarnings, setPendingEarnings] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Fetch profile data
    useEffect(() => {
        const fetchUserData = async () => {
            if (!currentUser) {
                setProfileLoading(false);
                return;
            }

            try {
                setProfileLoading(true);
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userFormData = {
                        email: userData.email || currentUser.email || "",
                        firstName: userData.firstName || "",
                        middleName: userData.middleName || "",
                        lastName: userData.lastName || "",
                        dateOfBirth: userData.dateOfBirth || "",
                        gender: userData.gender || "",
                        phoneNumber: userData.phoneNumber || "",
                        city: userData.city || "",
                        state: userData.state || "",
                        zipCode: userData.zipCode || "",
                        houseNumber: userData.houseNumber || ""
                    };
                    setProfileFormData(userFormData);
                    setOriginalFormData(userFormData);
                    
                    if (userData.profileImage) {
                        setProfileImageUrl(userData.profileImage);
                    }
                } else {
                    const defaultData = {
                        email: currentUser.email || "",
                        firstName: "",
                        middleName: "",
                        lastName: "",
                        dateOfBirth: "",
                        gender: "",
                        phoneNumber: "",
                        city: "",
                        state: "",
                        zipCode: "",
                        houseNumber: ""
                    };
                    setProfileFormData(defaultData);
                    setOriginalFormData(defaultData);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser]);

    // Fetch host bookings
    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) {
                setBookingsLoading(false);
                return;
            }

            try {
                setBookingsLoading(true);
                const q = query(
                    collection(db, "bookings"),
                    where("hostId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const bookingsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                bookingsData.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                    return dateB - dateA;
                });

                setBookings(bookingsData);

                // Fetch guest info for all bookings
                bookingsData.forEach(booking => {
                    if (booking.guestId && !guestInfo[booking.guestId]) {
                        fetchGuestInfo(booking.guestId);
                    }
                });
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
                setBookingsLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    // Fetch guest information
    const fetchGuestInfo = async (guestId) => {
        if (!guestId || guestInfo[guestId]) return;
        
        try {
            const guestDoc = await getDoc(doc(db, "users", guestId));
            if (guestDoc.exists()) {
                setGuestInfo(prev => ({
                    ...prev,
                    [guestId]: guestDoc.data()
                }));
            }
        } catch (error) {
            console.error("Error fetching guest info:", error);
        }
    };

    // Load earnings
    useEffect(() => {
        const loadEarnings = async () => {
            if (!currentUser) {
                setEarningsLoading(false);
                return;
            }

            try {
                setEarningsLoading(true);
                const userId = currentUser.uid;
                
                const walletRef = doc(db, "wallets", userId);
                const walletSnap = await getDoc(walletRef);
                
                if (walletSnap.exists()) {
                    const walletData = walletSnap.data();
                    setEarnings(walletData.earnings || 0);
                    setPendingEarnings(walletData.pendingEarnings || 0);
                }

                const transactionsRef = collection(db, "transactions");
                const earningsQuery = query(
                    transactionsRef,
                    where("hostId", "==", userId),
                    where("type", "==", "earnings"),
                    where("status", "==", "completed")
                );
                const earningsSnap = await getDocs(earningsQuery);
                
                const total = earningsSnap.docs.reduce((sum, doc) => {
                    return sum + (doc.data().amount || 0);
                }, 0);
                
                setTotalEarnings(total);

                // Load all transactions
                const allTransactionsQuery = query(
                    collection(db, "transactions"),
                    where("hostId", "==", userId)
                );
                const allTransactionsSnap = await getDocs(allTransactionsQuery);
                const transactionsData = allTransactionsSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })).sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });

                setTransactions(transactionsData);
                setFilteredTransactions(transactionsData);
            } catch (error) {
                console.error("Error loading earnings:", error);
            } finally {
                setEarningsLoading(false);
            }
        };

        loadEarnings();
    }, [currentUser]);

    // Apply earnings filters
    useEffect(() => {
        let filtered = [...transactions];

        if (filterType !== "all") {
            filtered = filtered.filter((t) => t.type === filterType);
        }

        if (filterStatus !== "all") {
            filtered = filtered.filter((t) => t.status === filterStatus);
        }

        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((t) => {
                const tDate = t.createdAt?.toDate() || new Date(t.createdAt);
                return tDate >= fromDate;
            });
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((t) => {
                const tDate = t.createdAt?.toDate() || new Date(t.createdAt);
                return tDate <= toDate;
            });
        }

        setFilteredTransactions(filtered);
    }, [filterType, filterStatus, filterDateFrom, filterDateTo, transactions]);

    // Profile handlers
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileEditClick = () => {
        setShowProfileSave(true);
        setShowProfileEdit(false);
        setShowImageUpload(true);
    };

    const handleProfileCancelBtn = () => {
        if (originalFormData) {
            setProfileFormData(originalFormData);
        }
        setShowProfileSave(false);
        setShowProfileEdit(true);
        setShowImageUpload(false);
        setProfileImage(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file");
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                alert("Image size must be less than 3MB");
                return;
            }
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImageToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) throw new Error("Failed to upload image to Cloudinary");
        const data = await res.json();
        return data.secure_url;
    };

    const handleProfileSubmit = async (e) => {
        e?.preventDefault();
        
        if (!currentUser) {
            alert("Please log in to save your profile.");
            return;
        }

        try {
            setProfileLoading(true);
            let imageUrl = profileImageUrl;

            if (profileImage) {
                setUploadingImage(true);
                imageUrl = await uploadImageToCloudinary(profileImage);
                setProfileImageUrl(imageUrl);
                setUploadingImage(false);
            }

            const userDocRef = doc(db, "users", currentUser.uid);
            const updateData = {
                ...profileFormData,
                profileImage: imageUrl || null,
                updatedAt: serverTimestamp(),
            };

            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                updateData.createdAt = serverTimestamp();
                updateData.email = currentUser.email || profileFormData.email;
            }

            await setDoc(userDocRef, updateData, { merge: true });
            setOriginalFormData({ ...profileFormData });
            
            alert("Profile updated successfully! ✅");
            setShowProfileSave(false);
            setShowProfileEdit(true);
            setShowImageUpload(false);
            setProfileImage(null);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setProfileLoading(false);
            setUploadingImage(false);
        }
    };

    // Booking handlers
    const filteredBookings = bookings.filter((booking) => {
        if (selectedTab === "all") return true;
        return booking.status === selectedTab;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "confirmed":
                return {
                    color: "#10b981",
                    bgColor: "#d1fae5",
                    icon: <CheckCircle size={16} />,
                    text: "Confirmed"
                };
            case "pending":
                return {
                    color: "#f59e0b",
                    bgColor: "#fef3c7",
                    icon: <Clock size={16} />,
                    text: "Pending"
                };
            case "cancelled":
                return {
                    color: "#ef4444",
                    bgColor: "#fee2e2",
                    icon: <XCircle size={16} />,
                    text: "Cancelled"
                };
            default:
                return {
                    color: "#6b7280",
                    bgColor: "#f3f4f6",
                    icon: <Clock size={16} />,
                    text: status || "Unknown"
                };
        }
    };

    const formatDate = (date) => {
        if (!date) return "N/A";
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        try {
            const bookingRef = doc(db, "bookings", bookingId);
            await updateDoc(bookingRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            setBookings(bookings.map(b => 
                b.id === bookingId ? { ...b, status: newStatus } : b
            ));
            alert(`Booking ${newStatus} successfully`);
        } catch (error) {
            console.error("Error updating booking:", error);
            alert("Failed to update booking. Please try again.");
        }
    };

    // Earnings helpers
    const formatWalletDate = (timestamp) => {
        if (!timestamp) return "N/A";
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAmount = (amount) => {
        return `₱${Number(amount).toFixed(2)}`;
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            earnings: "Earnings",
            refund: "Refund",
            payout: "Payout",
        };
        return labels[type] || type;
    };

    const getStatusColor = (status) => {
        const colors = {
            completed: "#10b981",
            pending: "#f59e0b",
            failed: "#ef4444",
        };
        return colors[status] || "#6b7280";
    };

    const clearFilters = () => {
        setFilterType("all");
        setFilterStatus("all");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    if (!currentUser) {
        return (
            <>
                <Header />
                <div className="setting_container" style={{ paddingTop: "120px", textAlign: "center" }}>
                    <h2>Please log in to view settings</h2>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="setting_container">
                <aside className="setting_aside">
                    <h3>Settings</h3>
                    <div className='setting_nav_container'>
                        <nav>
                            <button 
                                className={`nav_btn_group ${activeTab === "profile" ? "active" : ""}`}
                                onClick={() => setActiveTab("profile")}
                            >
                                <User className="sett_nav_icon" size={26} />
                                <span>Profile</span>
                            </button>
                            <button 
                                className={`nav_btn_group ${activeTab === "bookings" ? "active" : ""}`}
                                onClick={() => setActiveTab("bookings")}
                            >
                                <Calendar className="sett_nav_icon" size={26} />
                                <span>Bookings</span>
                            </button>
                            <button 
                                className={`nav_btn_group ${activeTab === "earnings" ? "active" : ""}`}
                                onClick={() => setActiveTab("earnings")}
                            >
                                <TrendingUp className="sett_nav_icon" size={26} />
                                <span>Earnings</span>
                            </button>
                        </nav>
                    </div>
                </aside>
                <main className="settings_main">
                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <article className="settings_Pass_Arti">
                            <h2>Profile</h2>
                            {profileLoading ? (
                                <div style={{ textAlign: "center", padding: "2rem" }}>
                                    <p>Loading profile...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="profile-card" style={{ marginTop: "2rem" }}>
                                        <div className="profile-header">
                                            <div className="overlay"></div>
                                            <div className="profile-header-content">
                                                <div className="profile-img-wrapper">
                                                    {profileImageUrl ? (
                                                        <img src={profileImageUrl} alt="Profile" />
                                                    ) : (
                                                        <div style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            borderRadius: "50%",
                                                            background: "var(--primary-gradient)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "4rem",
                                                            color: "#fff"
                                                        }}>
                                                            <User size={80} />
                                                        </div>
                                                    )}
                                                    {showImageUpload && (
                                                        <label htmlFor="host-profile-image-upload" className="edit-img" style={{ cursor: "pointer" }}>
                                                            📷
                                                            <input
                                                                id="host-profile-image-upload"
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleImageChange}
                                                                style={{ display: "none" }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className="edit-profile-btn"
                                                    onClick={handleProfileEditClick}
                                                    disabled={profileLoading}
                                                >
                                                    <span>✏️</span> Edit Profile
                                                </button>
                                                {uploadingImage && (
                                                    <div style={{ marginTop: "8px", color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                                                        Uploading image...
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-section">
                                            <h3>Personal Details</h3>
                                            <div className="form-grid">
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>First Name</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="firstName"
                                                                value={profileFormData.firstName || ""}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter first name"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>Middle Name</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="middleName"
                                                                value={profileFormData.middleName || ""}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter middle name"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>Last Name</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="lastName"
                                                                value={profileFormData.lastName}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter last name"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>Date of Birth</legend>
                                                        <div className="input-group">
                                                            <Calendar className="input-icon" />
                                                            <input
                                                                type="date"
                                                                name="dateOfBirth"
                                                                value={profileFormData.dateOfBirth}
                                                                onChange={handleProfileChange}
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                                <div className="full-width">
                                                    <fieldset className='field_input'>
                                                        <legend>Gender</legend>
                                                        <div className="input-group select-group">
                                                            <Users className="input-icon" />
                                                            <select
                                                                name="gender"
                                                                value={profileFormData.gender}
                                                                onChange={handleProfileChange}
                                                                disabled={showProfileEdit}
                                                            >
                                                                <option value="">Select gender</option>
                                                                <option value="male">Male</option>
                                                                <option value="female">Female</option>
                                                                <option value="non-binary">Non-binary</option>
                                                                <option value="prefer-not-to-say">Prefer not to say</option>
                                                            </select>
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>

                                            <hr />

                                            <div className='form-grid-section2'>
                                                <h3>Contacts</h3>
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>Email Address</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                value={profileFormData.email}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter Email address"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                    <fieldset className='field_input'>
                                                        <legend>Phone number</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="tel"
                                                                name="phoneNumber"
                                                                value={profileFormData.phoneNumber}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter Phone number"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>

                                            <hr />

                                            <div className='form-grid-section3'>
                                                <h3>Address</h3>
                                                <div>
                                                    <fieldset className='field_input'>
                                                        <legend>House number/Lot number</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="houseNumber"
                                                                value={profileFormData.houseNumber}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter House number/Lot number"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                    <fieldset className='field_input'>
                                                        <legend>City</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="city"
                                                                value={profileFormData.city}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter City name"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                    <fieldset className='field_input'>
                                                        <legend>State</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="state"
                                                                value={profileFormData.state}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter State name"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                    <fieldset className='field_input'>
                                                        <legend>Zipcode</legend>
                                                        <div className="input-group">
                                                            <User className="input-icon" />
                                                            <input
                                                                type="text"
                                                                name="zipCode"
                                                                value={profileFormData.zipCode}
                                                                onChange={handleProfileChange}
                                                                placeholder="Enter Zipcode"
                                                                disabled={showProfileEdit}
                                                                readOnly={showProfileEdit}
                                                            />
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>

                                            <div className="btn-group">
                                                {showProfileEdit && (
                                                    <button
                                                        type="button"
                                                        className="save-btn"
                                                        onClick={handleProfileEditClick}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {showProfileSave && (
                                                    <button 
                                                        type="button" 
                                                        className="save-btn" 
                                                        onClick={handleProfileSubmit}
                                                        disabled={profileLoading || uploadingImage}
                                                    >
                                                        {profileLoading || uploadingImage ? "Saving..." : "Save Changes"}
                                                    </button>
                                                )}
                                                {showProfileSave && (
                                                    <button type="button" className="cancel-btn" onClick={handleProfileCancelBtn}>
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </article>
                    )}

                    {/* Bookings Tab */}
                    {activeTab === "bookings" && (
                        <article className="settings_Pass_Arti">
                            <h2>Host Bookings</h2>
                            
                            <div className="tabs" style={{ marginTop: "2rem", marginBottom: "2rem", borderBottom: "2px solid rgba(255, 255, 255, 0.1)" }}>
                                <button
                                    className={`tab ${selectedTab === "all" ? "tab-active" : ""}`}
                                    onClick={() => setSelectedTab("all")}
                                >
                                    All ({bookings.length})
                                </button>
                                <button
                                    className={`tab ${selectedTab === "pending" ? "tab-active" : ""}`}
                                    onClick={() => setSelectedTab("pending")}
                                >
                                    Pending ({bookings.filter(b => b.status === "pending").length})
                                </button>
                                <button
                                    className={`tab ${selectedTab === "confirmed" ? "tab-active" : ""}`}
                                    onClick={() => setSelectedTab("confirmed")}
                                >
                                    Confirmed ({bookings.filter(b => b.status === "confirmed").length})
                                </button>
                                <button
                                    className={`tab ${selectedTab === "cancelled" ? "tab-active" : ""}`}
                                    onClick={() => setSelectedTab("cancelled")}
                                >
                                    Cancelled ({bookings.filter(b => b.status === "cancelled").length})
                                </button>
                            </div>

                            {bookingsLoading ? (
                                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text)" }}>
                                    <p>Loading bookings...</p>
                                </div>
                            ) : filteredBookings.length === 0 ? (
                                <div style={{ 
                                    textAlign: "center", 
                                    padding: "4rem", 
                                    background: "rgba(255, 255, 255, 0.02)",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}>
                                    <Calendar size={48} style={{ color: "rgba(255, 255, 255, 0.5)", marginBottom: "1rem" }} />
                                    <h3 style={{ color: "var(--text)", marginBottom: "0.5rem" }}>No bookings found</h3>
                                    <p style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                                        {selectedTab === "all" 
                                            ? "You don't have any bookings yet."
                                            : `You don't have any ${selectedTab} bookings.`
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: "1.5rem" }}>
                                    {filteredBookings.map((booking) => {
                                        const statusBadge = getStatusBadge(booking.status);
                                        const guest = guestInfo[booking.guestId];
                                        return (
                                            <div
                                                key={booking.id}
                                                style={{
                                                    background: "rgba(255, 255, 255, 0.02)",
                                                    borderRadius: "12px",
                                                    padding: "1.5rem",
                                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                                    transition: "all 0.3s ease"
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ color: "var(--text)", marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                                                            {booking.listingTitle || "Unknown Property"}
                                                        </h3>
                                                        {guest && (
                                                            <div style={{ marginBottom: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                Guest: {guest.firstName} {guest.lastName} ({booking.guestId?.substring(0, 8)}...)
                                                            </div>
                                                        )}
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                <Calendar size={16} />
                                                                <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                <Users size={16} />
                                                                <span>{booking.guests || 1} guest{booking.guests > 1 ? "s" : ""}</span>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                                                <DollarSign size={16} />
                                                                <span>{booking.nights || 0} night{booking.nights > 1 ? "s" : ""}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.5rem",
                                                                padding: "0.5rem 1rem",
                                                                borderRadius: "20px",
                                                                background: statusBadge.bgColor,
                                                                color: statusBadge.color,
                                                                fontSize: "0.875rem",
                                                                fontWeight: "600"
                                                            }}
                                                        >
                                                            {statusBadge.icon}
                                                            {statusBadge.text}
                                                        </div>
                                                        <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--primary)" }}>
                                                            ₱{booking.totalPrice?.toFixed(2) || "0.00"}
                                                        </div>
                                                    </div>
                                                </div>

                                                {booking.status === "pending" && (
                                                    <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                                                        <button
                                                            onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                                                            style={{
                                                                padding: "0.5rem 1.5rem",
                                                                background: "var(--primary-gradient)",
                                                                color: "white",
                                                                border: "none",
                                                                borderRadius: "8px",
                                                                cursor: "pointer",
                                                                fontWeight: "600",
                                                                fontSize: "0.875rem",
                                                                transition: "all 0.2s ease"
                                                            }}
                                                        >
                                                            <CheckCircle size={16} style={{ marginRight: "0.5rem", display: "inline" }} />
                                                            Confirm Booking
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                                                            style={{
                                                                padding: "0.5rem 1.5rem",
                                                                background: "transparent",
                                                                color: "#ef4444",
                                                                border: "1px solid #ef4444",
                                                                borderRadius: "8px",
                                                                cursor: "pointer",
                                                                fontWeight: "600",
                                                                fontSize: "0.875rem",
                                                                transition: "all 0.2s ease"
                                                            }}
                                                        >
                                                            <X size={16} style={{ marginRight: "0.5rem", display: "inline" }} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </article>
                    )}

                    {/* Earnings Tab */}
                    {activeTab === "earnings" && (
                        <article className="settings_Pass_Arti">
                            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <TrendingUp size={28} />
                                Earnings
                            </h2>

                            <div className="wallet-tabs" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
                                <button
                                    className={`wallet-tab ${earningsActiveTab === "overview" ? "active" : ""}`}
                                    onClick={() => setEarningsActiveTab("overview")}
                                >
                                    Overview
                                </button>
                                <button
                                    className={`wallet-tab ${earningsActiveTab === "transactions" ? "active" : ""}`}
                                    onClick={() => setEarningsActiveTab("transactions")}
                                >
                                    Transactions
                                </button>
                            </div>

                            {earningsActiveTab === "overview" && (
                                <div className="wallet-balance-content">
                                    <div className="balance-card earnings-card">
                                        <div className="balance-card-header">
                                            <TrendingUp size={24} color="#10b981" />
                                            <h3>Total Earnings</h3>
                                        </div>
                                        <div className="balance-amount">{formatAmount(totalEarnings)}</div>
                                        <p className="balance-label">All-time earnings from bookings</p>
                                    </div>

                                    <div className="balance-stats">
                                        <div className="balance-stat-card">
                                            <div className="stat-label">Available</div>
                                            <div className="stat-value">{formatAmount(earnings)}</div>
                                        </div>
                                        <div className="balance-stat-card">
                                            <div className="stat-label">Pending</div>
                                            <div className="stat-value">{formatAmount(pendingEarnings)}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: "2rem" }}>
                                        <Link to="/HostEarnings" style={{
                                            padding: "0.75rem 1.5rem",
                                            background: "var(--primary-gradient)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "12px",
                                            textDecoration: "none",
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}>
                                            <DollarSign size={18} />
                                            View Full Earnings Dashboard
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {earningsActiveTab === "transactions" && (
                                <div className="wallet-transactions-content">
                                    <div className="transactions-header">
                                        <h2>Transaction History</h2>
                                        <button
                                            className="filter-toggle-btn"
                                            onClick={() => setShowFilters(!showFilters)}
                                        >
                                            <Filter size={18} />
                                            Filters
                                        </button>
                                    </div>

                                    {showFilters && (
                                        <div className="transactions-filters">
                                            <div className="filter-group">
                                                <label>Type</label>
                                                <select
                                                    value={filterType}
                                                    onChange={(e) => setFilterType(e.target.value)}
                                                >
                                                    <option value="all">All Types</option>
                                                    <option value="earnings">Earnings</option>
                                                    <option value="refund">Refund</option>
                                                    <option value="payout">Payout</option>
                                                </select>
                                            </div>

                                            <div className="filter-group">
                                                <label>Status</label>
                                                <select
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="failed">Failed</option>
                                                </select>
                                            </div>

                                            <div className="filter-group">
                                                <label>From Date</label>
                                                <input
                                                    type="date"
                                                    value={filterDateFrom}
                                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                                />
                                            </div>

                                            <div className="filter-group">
                                                <label>To Date</label>
                                                <input
                                                    type="date"
                                                    value={filterDateTo}
                                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                                />
                                            </div>

                                            <button className="clear-filters-btn" onClick={clearFilters}>
                                                <X size={16} />
                                                Clear
                                            </button>
                                        </div>
                                    )}

                                    <div className="transactions-list">
                                        {filteredTransactions.length === 0 ? (
                                            <div className="empty-state">
                                                <p>No transactions found</p>
                                            </div>
                                        ) : (
                                            filteredTransactions.map((transaction) => (
                                                <div key={transaction.id} className="transaction-item">
                                                    <div className="transaction-icon">
                                                        <TrendingUp size={20} color="#10b981" />
                                                    </div>
                                                    <div className="transaction-details">
                                                        <div className="transaction-type">
                                                            {getTransactionTypeLabel(transaction.type)}
                                                        </div>
                                                        <div className="transaction-meta">
                                                            {formatWalletDate(transaction.createdAt)}
                                                            {transaction.bookingId && (
                                                                <span className="booking-id">
                                                                    Booking: {transaction.bookingId.substring(0, 8)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="transaction-amount">
                                                        <div className="amount positive">
                                                            +{formatAmount(transaction.amount)}
                                                        </div>
                                                        <div
                                                            className="transaction-status"
                                                            style={{ color: getStatusColor(transaction.status) }}
                                                        >
                                                            {transaction.status}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </article>
                    )}
                </main>
            </div>
            <Footer />
        </>
    );
}

