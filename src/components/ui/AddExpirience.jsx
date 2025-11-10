// AddExperience.jsx
// Complete React Component for Adding Experiences
// Copy this entire file to your project

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowLeft, ArrowRight, Check, Clock, Users, MapPin, Star, Award } from "lucide-react";
import { auth, db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import MapPicker from "./MapPicker";

const REQUIRED_IMAGE_COUNT = 3;
const MAX_IMAGE_COUNT = 10;

const EXPERIENCE_TYPES = [
    { id: "adventure", name: "Adventure", icon: "🏔️", description: "Thrilling outdoor activities" },
    { id: "cultural", name: "Cultural", icon: "🎭", description: "Immerse in local traditions" },
    { id: "food-drink", name: "Food & Drink", icon: "🍷", description: "Culinary experiences" },
    { id: "wellness", name: "Wellness", icon: "🧘", description: "Mind and body activities" },
    { id: "nature", name: "Nature", icon: "🌿", description: "Wildlife and nature tours" },
    { id: "entertainment", name: "Entertainment", icon: "🎪", description: "Shows and performances" },
    { id: "sports", name: "Sports", icon: "⚽", description: "Active sports experiences" },
    { id: "workshop", name: "Workshop", icon: "🎨", description: "Learn new skills" },
];

const DURATION_OPTIONS = [
    "1 hour", "2 hours", "3 hours", "4 hours",
    "Half day (4-6 hours)", "Full day (8+ hours)", "Multi-day"
];

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];

const STEPS = [
    { id: 1, title: "Experience Type", description: "What kind of experience do you offer?" },
    { id: 2, title: "Basic Info", description: "Tell us about your experience" },
    { id: 3, title: "Details", description: "Duration, capacity, and location" },
    { id: 4, title: "What to Expect", description: "Itinerary and highlights" },
    { id: 5, title: "Photos", description: "Show your experience" },
    { id: 6, title: "Pricing", description: "Set your rates" },
];

// 🔹 Replace with your Cloudinary credentials
const CLOUD_NAME = "dv42rw8m7";
const UPLOAD_PRESET = "unsigned_preset";

export default function AddExperience({ onExperienceCreated, onClose }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [stepErrors, setStepErrors] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        category: "experience",
        type: "",
        title: "",
        tagline: "",
        description: "",
        location: "", // Keep for backward compatibility (text address)
        locationData: null, // New: { lat, lng, address }
        duration: "",
        maxGuests: "",
        minGuests: "1",
        skillLevel: "",
        highlights: "",
        itinerary: "",
        included: "",
        notIncluded: "",
        requirements: "",
        cancellationPolicy: "flexible",
        price: "",
        groupDiscount: "",
        languages: "",
        hostInfo: "",
    });

    // 🔹 Listen to auth changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // 🔹 Cleanup image previews
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch { }
            });
        };
    }, [images]);

    // 🔹 Handle image selection
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        if (images.length + files.length > MAX_IMAGE_COUNT) {
            setUploadError(`Maximum ${MAX_IMAGE_COUNT} images allowed.`);
            return;
        }

        const validFiles = files.filter((file) => {
            const isValid = file.type.startsWith("image/");
            const isUnderLimit = file.size <= 3 * 1024 * 1024;
            return isValid && isUnderLimit;
        });

        if (validFiles.length !== files.length) {
            setUploadError("Some files were skipped. Must be valid images under 3MB.");
        }

        const newImages = validFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));

        setImages((prev) => [...prev, ...newImages]);
        setUploadError("");
    };

    // 🔹 Remove image
    const removeImage = (index) => {
        setImages((prev) => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    // 🔹 Upload images to Cloudinary
    const uploadImagesToCloudinary = async () => {
        const uploadedUrls = [];
        for (const image of images) {
            const formDataCloud = new FormData();
            formDataCloud.append("file", image.file);
            formDataCloud.append("upload_preset", UPLOAD_PRESET);

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                {
                    method: "POST",
                    body: formDataCloud,
                }
            );

            if (!res.ok) throw new Error("Failed to upload to Cloudinary");
            const data = await res.json();
            uploadedUrls.push(data.secure_url);
        }
        return uploadedUrls;
    };

    // 🔹 Validate each step
    const validateStep = (step) => {
        const errors = {};

        switch (step) {
            case 1:
                if (!formData.type) errors.type = "Please select an experience type";
                break;
            case 2:
                if (!formData.title) errors.title = "Title is required";
                if (!formData.description) errors.description = "Description is required";
                if (!formData.tagline) errors.tagline = "Tagline is required";
                break;
            case 3:
                if (!formData.locationData && !formData.location) {
                    errors.location = "Location is required. Please select a location on the map.";
                }
                if (!formData.duration) errors.duration = "Duration is required";
                if (!formData.maxGuests || formData.maxGuests <= 0)
                    errors.maxGuests = "Valid guest count is required";
                if (!formData.skillLevel) errors.skillLevel = "Skill level is required";
                break;
            case 4:
                if (!formData.highlights) errors.highlights = "Highlights are required";
                if (!formData.included) errors.included = "Please specify what's included";
                break;
            case 5:
                if (images.length < REQUIRED_IMAGE_COUNT)
                    errors.images = `At least ${REQUIRED_IMAGE_COUNT} images are required`;
                break;
            case 6:
                if (!formData.price || formData.price <= 0)
                    errors.price = "Valid price is required";
                break;
        }

        setStepErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // 🔹 Navigation
    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
            setStepErrors({});
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setStepErrors({});
    };

    // 🔹 Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep(6)) return;

        if (!currentUser) {
            setUploadError("You must be signed in to create an experience.");
            return;
        }

        try {
            setIsUploading(true);
            const cloudinaryUrls = await uploadImagesToCloudinary();

            const finalData = {
                ...formData,
                price: Number(formData.price),
                maxGuests: Number(formData.maxGuests),
                minGuests: Number(formData.minGuests),
                groupDiscount: formData.groupDiscount ? Number(formData.groupDiscount) : null,
                highlights: formData.highlights.split('\n').filter(h => h.trim()),
                itinerary: formData.itinerary ? formData.itinerary.split('\n').filter(i => i.trim()) : [],
                included: formData.included.split('\n').filter(i => i.trim()),
                notIncluded: formData.notIncluded ? formData.notIncluded.split('\n').filter(i => i.trim()) : [],
                requirements: formData.requirements ? formData.requirements.split('\n').filter(r => r.trim()) : [],
                languages: formData.languages.split(',').map(lang => lang.trim()),
                // Store location data in Firestore
                location: formData.locationData ? {
                    lat: formData.locationData.lat,
                    lng: formData.locationData.lng,
                    address: formData.locationData.address
                } : (formData.location ? { address: formData.location } : null),
                images: cloudinaryUrls,
                ownerId: currentUser.uid,
                createdAt: new Date(),
            };

            await addDoc(collection(db, "experiences"), finalData);
            console.log("✅ Experience saved:", finalData);

            if (onExperienceCreated) onExperienceCreated(finalData);
            if (onClose) onClose();
            navigate("/HostPage");
        } catch (error) {
            console.error("❌ Error creating experience:", error);
            setUploadError("Failed to create experience. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // 🔹 Render Step Content
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="host-form-grid host-form-grid-2">
                        {EXPERIENCE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: type.id })}
                                className={`service-type-card ${formData.type === type.id ? "service-type-selected" : ""}`}
                            >
                                <span className="service-type-icon">{type.icon}</span>
                                <span className="service-type-name">{type.name}</span>
                                <p className="service-type-description">{type.description}</p>
                            </button>
                        ))}
                        {stepErrors.type && <p className="host-form-error">{stepErrors.type}</p>}
                    </div>
                );

            case 2:
                return (
                    <div className="host-form-group" style={{ gap: "1rem" }}>
                        <div className="host-form-group">
                            <label className="host-form-label">
                                Experience Title <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Sunset Kayaking Adventure"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="host-form-input"
                            />
                            {stepErrors.title && <p className="host-form-error">{stepErrors.title}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                Catchy Tagline <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Paddle through pristine waters at golden hour"
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                className="host-form-input"
                            />
                            {stepErrors.tagline && <p className="host-form-error">{stepErrors.tagline}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                Full Description <span className="required">*</span>
                            </label>
                            <textarea
                                rows={6}
                                placeholder="Describe your experience in detail. What makes it unique? What will guests feel and learn?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="host-form-textarea"
                            />
                            {stepErrors.description && <p className="host-form-error">{stepErrors.description}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">Languages Offered</label>
                            <input
                                type="text"
                                placeholder="e.g., English, Spanish, Filipino"
                                value={formData.languages}
                                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                                className="host-form-input"
                            />
                            <p className="host-form-subtitle" style={{ marginTop: "4px" }}>Separate multiple languages with commas</p>
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">About the Host</label>
                            <textarea
                                rows={3}
                                placeholder="Tell guests about yourself and your expertise..."
                                value={formData.hostInfo}
                                onChange={(e) => setFormData({ ...formData, hostInfo: e.target.value })}
                                className="host-form-textarea"
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="host-form-grid host-form-grid-2">
                        {/* Map Picker */}
                        <div className="host-form-group" style={{ gridColumn: "1 / -1" }}>
                            <MapPicker
                                onLocationSelect={(locationData) => {
                                    setFormData({
                                        ...formData,
                                        locationData: locationData,
                                        location: locationData.address, // Keep text location for backward compatibility
                                    });
                                }}
                                initialLocation={formData.locationData}
                            />
                            {stepErrors.location && <p className="host-form-error">{stepErrors.location}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                <Clock size={16} style={{ marginRight: "4px" }} />
                                Duration <span className="required">*</span>
                            </label>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="host-form-select"
                            >
                                <option value="">Select duration...</option>
                                {DURATION_OPTIONS.map((duration) => (
                                    <option key={duration} value={duration}>{duration}</option>
                                ))}
                            </select>
                            {stepErrors.duration && <p className="host-form-error">{stepErrors.duration}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                <Award size={16} style={{ marginRight: "4px" }} />
                                Skill Level <span className="required">*</span>
                            </label>
                            <select
                                value={formData.skillLevel}
                                onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                                className="host-form-select"
                            >
                                <option value="">Select level...</option>
                                {SKILL_LEVELS.map((level) => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                            {stepErrors.skillLevel && <p className="host-form-error">{stepErrors.skillLevel}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                <Users size={16} style={{ marginRight: "4px" }} />
                                Min Guests
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.minGuests}
                                onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                                className="host-form-input"
                            />
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                Max Guests <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.maxGuests}
                                onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                className="host-form-input"
                            />
                            {stepErrors.maxGuests && <p className="host-form-error">{stepErrors.maxGuests}</p>}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="host-form-group" style={{ gap: "1rem" }}>
                        <div className="host-form-group">
                            <label className="host-form-label">
                                <Star size={16} style={{ marginRight: "4px", color: "var(--primary)" }} />
                                Experience Highlights <span className="required">*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="List the best parts of your experience (one per line)"
                                value={formData.highlights}
                                onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                                className="host-form-textarea"
                            />
                            {stepErrors.highlights && <p className="host-form-error">{stepErrors.highlights}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">Itinerary (Optional)</label>
                            <textarea
                                rows={5}
                                placeholder="Step-by-step schedule of your experience"
                                value={formData.itinerary}
                                onChange={(e) => setFormData({ ...formData, itinerary: e.target.value })}
                                className="host-form-textarea"
                            />
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                What's Included <span className="required">*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Equipment, guide, snacks, transportation, photos, etc. (one per line)"
                                value={formData.included}
                                onChange={(e) => setFormData({ ...formData, included: e.target.value })}
                                className="host-form-textarea"
                            />
                            {stepErrors.included && <p className="host-form-error">{stepErrors.included}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">What's NOT Included</label>
                            <textarea
                                rows={3}
                                placeholder="Personal expenses, tips, souvenirs, etc."
                                value={formData.notIncluded}
                                onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                                className="host-form-textarea"
                            />
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">Requirements / What to Bring</label>
                            <textarea
                                rows={3}
                                placeholder="Comfortable clothes, water bottle, sunscreen, camera, valid ID..."
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                className="host-form-textarea"
                            />
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">Cancellation Policy</label>
                            <select
                                value={formData.cancellationPolicy}
                                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                                className="host-form-select"
                            >
                                <option value="flexible">Flexible - Full refund 24 hours before</option>
                                <option value="moderate">Moderate - Full refund 5 days before</option>
                                <option value="strict">Strict - 50% refund 7 days before</option>
                                <option value="non-refundable">Non-refundable</option>
                            </select>
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="host-form-group">
                        <label className="host-form-label">
                            Experience Photos <span className="required">*</span>
                            <span className="host-form-subtitle" style={{ marginLeft: "8px" }}>
                                ({images.length} / {REQUIRED_IMAGE_COUNT} minimum, {MAX_IMAGE_COUNT} maximum). First photo will be your cover image.
                            </span>
                        </label>
                        <div className="host-image-preview-grid">
                            {images.map((img, idx) => (
                                <div key={idx} className="host-image-preview-item" style={{ position: "relative" }}>
                                    <img
                                        src={img.preview}
                                        alt={`Preview ${idx + 1}`}
                                        className="host-image-preview"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="host-image-remove-btn"
                                        aria-label="Remove image"
                                    >
                                        <X size={16} />
                                    </button>
                                    {idx === 0 && (
                                        <div style={{
                                            position: "absolute",
                                            bottom: "8px",
                                            left: "8px",
                                            background: "var(--primary-gradient)",
                                            color: "#ffffff",
                                            fontSize: "0.75rem",
                                            padding: "4px 8px",
                                            borderRadius: "12px",
                                            fontWeight: "500"
                                        }}>
                                            Cover Photo
                                        </div>
                                    )}
                                </div>
                            ))}
                            {images.length < MAX_IMAGE_COUNT && (
                                <label className="host-image-upload-btn">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="host-image-input-hidden"
                                    />
                                    <Plus size={24} className="host-image-upload-icon" />
                                    <span className="host-image-upload-text">Add Images</span>
                                </label>
                            )}
                        </div>
                        {uploadError && <p className="host-form-error">{uploadError}</p>}
                        {stepErrors.images && <p className="host-form-error">{stepErrors.images}</p>}
                    </div>
                );

            case 6:
                return (
                    <div className="host-form-group" style={{ gap: "1.5rem" }}>
                        <div className="host-form-grid host-form-grid-2">
                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Price per Person <span className="required">*</span>
                                </label>
                                <div style={{ position: "relative" }}>
                                    <span style={{
                                        position: "absolute",
                                        left: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "rgba(255, 255, 255, 0.6)",
                                        fontSize: "1rem"
                                    }}>₱</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="host-form-input"
                                        style={{ paddingLeft: "2.5rem" }}
                                    />
                                </div>
                                {stepErrors.price && <p className="host-form-error">{stepErrors.price}</p>}
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">Group Discount (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    placeholder="10"
                                    value={formData.groupDiscount}
                                    onChange={(e) => setFormData({ ...formData, groupDiscount: e.target.value })}
                                    className="host-form-input"
                                />
                                <p className="host-form-subtitle" style={{ marginTop: "4px" }}>For groups of 5+ people</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{
                            marginTop: "1.5rem",
                            padding: "1.5rem",
                            background: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}>
                            <h3 className="host-form-section-title" style={{ marginBottom: "1rem", fontSize: "1.125rem" }}>
                                <Check size={18} style={{ marginRight: "8px", color: "var(--primary)" }} />
                                Experience Summary
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Type:</span>
                                    <span style={{ color: "var(--text, #ffffff)", fontWeight: "500", textTransform: "capitalize" }}>
                                        {EXPERIENCE_TYPES.find(t => t.id === formData.type)?.name || "—"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <span style={{ color: "var(--text-secondary, rgba(255, 255, 255, 0.6))" }}>Duration:</span>
                                    <span style={{ color: "var(--text, #ffffff)", fontWeight: "500" }}>{formData.duration || "—"}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <span style={{ color: "var(--text-secondary, rgba(255, 255, 255, 0.6))" }}>Skill Level:</span>
                                    <span style={{ color: "var(--text, #ffffff)", fontWeight: "500" }}>{formData.skillLevel || "—"}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Capacity:</span>
                                    <span style={{ color: "#ffffff", fontWeight: "500" }}>
                                        {formData.minGuests || "1"}-{formData.maxGuests || "—"} guests
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Photos:</span>
                                    <span style={{ color: "#ffffff", fontWeight: "500" }}>{images.length} uploaded</span>
                                </div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "1rem",
                                    marginTop: "0.5rem",
                                    background: "rgba(255, 107, 53, 0.1)",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255, 107, 53, 0.3)"
                                }}>
                                    <span style={{ color: "#ffffff", fontWeight: "500" }}>Price per Person:</span>
                                    <span style={{
                                        fontWeight: "700",
                                        fontSize: "1.5rem",
                                        background: "var(--primary-gradient)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text"
                                    }}>
                                        ₱{formData.price || "0"}
                                    </span>
                                </div>
                                {formData.groupDiscount && (
                                    <div style={{ textAlign: "center", color: "var(--accent)", fontSize: "0.875rem", paddingTop: "0.5rem" }}>
                                        {formData.groupDiscount}% discount for groups of 5+
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="host-modal-form-container">
            <div className="host-modal-form-wrapper">
                <button
                    onClick={onClose}
                    className="host-modal-close-btn"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <div className="host-modal-form">
                    <h2 className="host-modal-title">Create an Experience</h2>

                    {/* Step Indicator */}
                    <div className="service-step-indicator">
                        <div className="service-steps-container">
                            {STEPS.map((step, idx) => (
                                <React.Fragment key={step.id}>
                                    <div className="service-step-item">
                                        <div
                                            className={`service-step-circle ${currentStep > step.id
                                                    ? "service-step-completed"
                                                    : currentStep === step.id
                                                        ? "service-step-active"
                                                        : "service-step-pending"
                                                }`}
                                        >
                                            {currentStep > step.id ? <Check size={18} /> : step.id}
                                        </div>
                                        <span className="service-step-label">
                                            {step.title}
                                        </span>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div
                                            className={`service-step-connector ${currentStep > step.id ? "service-step-connector-completed" : ""}`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Step Content */}
                    <form onSubmit={handleSubmit}>
                        <div className="host-form-section">
                            <h3 className="host-form-section-title">
                                {STEPS[currentStep - 1].title}
                            </h3>
                            <p className="host-form-subtitle">
                                {STEPS[currentStep - 1].description}
                            </p>

                            <div className="service-step-content">{renderStep()}</div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="host-form-actions">
                            <button
                                type="button"
                                onClick={currentStep === 1 ? onClose : prevStep}
                                disabled={currentStep === 1 && !onClose}
                                className="host-form-cancel-btn"
                                style={{ 
                                    opacity: currentStep === 1 && !onClose ? 0.5 : 1, 
                                    cursor: currentStep === 1 && !onClose ? "not-allowed" : "pointer" 
                                }}
                            >
                                <ArrowLeft size={18} style={{ marginRight: "8px" }} />
                                {currentStep === 1 ? "Cancel" : "Back"}
                            </button>

                            {currentStep < STEPS.length ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="host-form-submit-btn"
                                >
                                    Next
                                    <ArrowRight size={18} style={{ marginLeft: "8px" }} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="host-form-submit-btn"
                                    style={{ 
                                        background: isUploading ? "rgba(255, 255, 255, 0.2)" : "var(--primary-gradient)",
                                        cursor: isUploading ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {isUploading ? "Creating..." : "Create Experience"}
                                    {!isUploading && <Check size={18} style={{ marginLeft: "8px" }} />}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}