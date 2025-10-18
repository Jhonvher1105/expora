import React, { useState } from 'react';
import { User, Calendar, Users } from 'lucide-react';

import Header from './Header'
import Footer from '../generalFile/Footer'

export default function ProfileForm() {
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        gender: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = () => {
        console.log('Form submitted:', formData);
    };

    return (
        <>
            <Header/>
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
                                <button className="edit-img">📷</button>
                            </div>
                            <button className="edit-profile-btn">
                                <span>✏️</span> Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="form-section">
                        <div className="form-grid">
                            {/* First Name */}
                            <div>
                                <label>First Name</label>
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
                            </div>

                            {/* Middle Name */}
                            <div>
                                <label>Middle Name</label>
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
                            </div>

                            {/* Last Name */}
                            <div>
                                <label>Last Name</label>
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
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label>Date of Birth</label>
                                <div className="input-group">
                                    <Calendar className="input-icon" />
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="full-width">
                                <label>Gender</label>
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
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="btn-group">
                            <button className="save-btn" onClick={handleSubmit}>
                                Save Changes
                            </button>
                            <button className="cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer/>
        </>
    );
}
