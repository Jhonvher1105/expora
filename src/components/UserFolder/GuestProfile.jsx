import React, { useState, useEffect } from 'react';
import { User, Calendar, Users } from 'lucide-react';

import Header from './Header';
import Footer from '../generalFile/Footer';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Cloudinary configuration
const CLOUD_NAME = "dv42rw8m7";
const UPLOAD_PRESET = "unsigned_preset";

export default function GuestProfile() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [formData, setFormData] = useState({
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const [showSave, setShowSave] = useState(false);
    const [showEdit, setShowEdit] = useState(true);
    const [originalFormData, setOriginalFormData] = useState(null);

    // ✅ Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // ✅ Fetch user data from Firestore
    useEffect(() => {
        const fetchUserData = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
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
                    setFormData(userFormData);
                    setOriginalFormData(userFormData);
                    
                    // Set profile image if exists
                    if (userData.profileImage) {
                        setProfileImageUrl(userData.profileImage);
                    }
                } else {
                    // User document doesn't exist, use auth email
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
                    setFormData(defaultData);
                    setOriginalFormData(defaultData);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser]);

    const handleEditClick = () => {
        setShowSave(true);
        setShowEdit(false);
        setShowImageUpload(true);
    };

    const handleCancelBtn = () => {
        // Reset to original data
        if (originalFormData) {
            setFormData(originalFormData);
        }
        setShowSave(false);
        setShowEdit(true);
        setShowImageUpload(false);
        setProfileImage(null);
    };

    // ✅ Handle profile image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file");
                return;
            }
            // Validate file size (max 3MB)
            if (file.size > 3 * 1024 * 1024) {
                alert("Image size must be less than 3MB");
                return;
            }
            setProfileImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // ✅ Upload image to Cloudinary
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

    // ✅ Save changes to Firestore
    const handleSubmit = async (e) => {
        e?.preventDefault();
        
        if (!currentUser) {
            alert("Please log in to save your profile.");
            return;
        }

        try {
            setLoading(true);
            let imageUrl = profileImageUrl;

            // Upload new image if selected
            if (profileImage) {
                setUploadingImage(true);
                imageUrl = await uploadImageToCloudinary(profileImage);
                setProfileImageUrl(imageUrl);
                setUploadingImage(false);
            }

            // Update Firestore
            const userDocRef = doc(db, "users", currentUser.uid);
            const updateData = {
                ...formData,
                profileImage: imageUrl || null,
                updatedAt: serverTimestamp(),
            };

            // If user document doesn't exist, create it
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                updateData.createdAt = serverTimestamp();
                updateData.email = currentUser.email || formData.email;
            }

            await setDoc(userDocRef, updateData, { merge: true });

            // Update original data
            setOriginalFormData({ ...formData });
            
            alert("Profile updated successfully! ✅");
            setShowSave(false);
            setShowEdit(true);
            setShowImageUpload(false);
            setProfileImage(null);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
            setUploadingImage(false);
        }
    };

    // Show loading state while fetching user data or if user is not authenticated
    if (loading || !currentUser) {
        return (
            <>
                <Header />
                <div className="profile-container" style={{ padding: "2rem", textAlign: "center" }}>
                    <p>Loading profile...</p>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="profile-container">
                {/* Profile Card */}
                <div className="profile-card">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="overlay"></div>
                        <div className="profile-header-content">
                            <h1>Profile</h1>
                            <div className="profile-img-wrapper">
                                {profileImageUrl ? (
                                    <img
                                        src={profileImageUrl}
                                        alt="Profile"
                                    />
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
                                    <label htmlFor="profile-image-upload" className="edit-img" style={{ cursor: "pointer" }}>
                                        📷
                                        <input
                                            id="profile-image-upload"
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
                                onClick={handleEditClick}
                                disabled={loading}
                            >
                                <span>✏️</span> Edit Profile
                            </button>
                            {uploadingImage && (
                                <div style={{ 
                                    marginTop: "8px", 
                                    color: "rgba(255,255,255,0.7)",
                                    fontSize: "0.9rem"
                                }}>
                                    Uploading image...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form - NO Points Display Section for Guests */}
                    <div className="form-section">
                        <h3>Personal Details</h3>
                        <div className="form-grid">
                            {/* First Name */}
                            <div>
                                <fieldset className='field_input'>
                                    <legend>First Name</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName || ""}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                        />
                                    </div>
                                </fieldset>
                            </div>

                            {/* Middle Name */}
                            <div>
                                <fieldset className='field_input'>
                                    <legend>Middle Name</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="middleName"
                                            value={formData.middleName || ""}
                                            onChange={handleChange}
                                            placeholder="Enter middle name"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                        />
                                    </div>
                                </fieldset>
                            </div>

                            {/* Last Name */}
                            <div>
                                <fieldset className='field_input'>
                                    <legend>Last Name</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder="Enter last name"
                                        />
                                    </div>
                                </fieldset>
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <fieldset className='field_input'>
                                    <legend>Date of Birth</legend>
                                    <div className="input-group">
                                        <Calendar className="input-icon" />
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            onChange={handleChange}
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                        />
                                    </div>
                                </fieldset>
                            </div>

                            {/* Gender */}
                            <div className="full-width">
                                <fieldset className='field_input'>
                                    <legend>Gender</legend>
                                    <div className="input-group select-group">
                                        <Users className="input-icon" />
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            disabled={showEdit}
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
                            <div >
                                <fieldset className='field_input'>
                                    <legend>Email Address</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter Email address"
                                            disabled={showEdit}
                                            readOnly={showEdit}
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
                                            value={formData.phoneNumber}
                                            onChange={handleChange}
                                            placeholder="Enter Phone number"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                        />
                                    </div>
                                </fieldset>
                            </div>
                        </div>

                        <hr />

                        <div className='form-grid-section3'>
                            <h3>Address</h3>
                            <div >
                                <fieldset className='field_input'>
                                    <legend>House number/Lot number</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="houseNumber"
                                            value={formData.houseNumber}
                                            onChange={handleChange}
                                            placeholder="Enter House number/Lot number"
                                            disabled={showEdit}
                                            readOnly={showEdit}
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
                                            value={formData.city}
                                            onChange={handleChange}
                                            placeholder="Enter City name"
                                            disabled={showEdit}
                                            readOnly={showEdit}
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
                                            value={formData.state}
                                            onChange={handleChange}
                                            placeholder="Enter State name"
                                            disabled={showEdit}
                                            readOnly={showEdit}
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
                                            value={formData.zipCode}
                                            onChange={handleChange}
                                            placeholder="Enter Zipcode"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                        />
                                    </div>
                                </fieldset>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="btn-group">
                            {showEdit && (
                                <button
                                    type="button"
                                    className="save-btn"
                                    id="editBtn"
                                    onClick={handleEditClick}
                                >
                                    Edit
                                </button>
                            )}

                            {showSave && (
                            <button 
                                type="button" 
                                className="save-btn" 
                                id="saveBtn" 
                                onClick={handleSubmit}
                                disabled={loading || uploadingImage}
                            >
                                {loading || uploadingImage ? "Saving..." : "Save Changes"}
                            </button>
                            )}

                            <button type="button" className="cancel-btn" onClick={handleCancelBtn}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

