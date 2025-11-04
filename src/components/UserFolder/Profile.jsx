import React, { useState } from 'react';
import { User, Calendar, Users, Gift, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import Header from './Header';
import Footer from '../generalFile/Footer';
import { usePoints } from '../../context/PointsContext';

export default function ProfileForm() {
    const { points, loading: pointsLoading } = usePoints();
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

    const handleSubmit = (e) => {
        e?.preventDefault();
        // simple validation example
        if (!formData.email) {
            alert("Please provide an email address.");
            return;
        }
        setShowSave(false);
        console.log('Form submitted:', formData);
        // TODO: send to backend / firebase etc.
    };

    const [showSave, setShowSave] = useState(false);
    const [showEdit, setShowEdit] = useState(true);

    const handleEditClick = () => {
    setShowSave(true); 
    setShowEdit(false);
    };

    const handleCancelBtn = () => {
        setShowSave(false);
        setShowEdit(true);
    };

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
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
                                    alt="Profile"
                                />
                                <button type="button" className="edit-img">📷</button>
                            </div>
                            <button type="button" className="edit-profile-btn">
                                <span>✏️</span> Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Points Display Section */}
                    <div style={{
                        padding: "1.5rem",
                        background: "rgba(255,255,255,0.05)",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "50%",
                                background: "var(--primary-gradient)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <Sparkles size={24} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.3rem" }}>
                                    Points Balance
                                </div>
                                {pointsLoading ? (
                                    <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Loading...</div>
                                ) : (
                                    <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
                                        {points.toLocaleString()} points
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Link to="/Rewards" style={{
                                padding: "0.75rem 1.5rem",
                                background: "rgba(255,255,255,0.1)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "12px",
                                color: "var(--text)",
                                textDecoration: "none",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            }}
                            >
                                <Gift size={18} />
                                Rewards
                            </Link>
                            <Link to="/PointsHistory" style={{
                                padding: "0.75rem 1.5rem",
                                background: "rgba(255,255,255,0.1)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "12px",
                                color: "var(--text)",
                                textDecoration: "none",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            }}
                            >
                                History
                            </Link>
                        </div>
                    </div>

                    {/* Form */}
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
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
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
                                            value={formData.middleName}
                                            onChange={handleChange}
                                            placeholder="Enter middle name"
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
                            <button type="button" className="save-btn" id="saveBtn" onClick={handleSubmit}>Save Changes</button>
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