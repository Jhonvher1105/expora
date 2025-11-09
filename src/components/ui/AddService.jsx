import React, { useState, useEffect } from "react";
import {
    Plus,
    X,
    ArrowLeft,
    ArrowRight,
    Check,
    Clock,
    Users,
    MapPin,
} from "lucide-react";
import { db, auth } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import MapPicker from "./MapPicker";

const REQUIRED_IMAGE_COUNT = 3;
const MAX_IMAGE_COUNT = 8;
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dv42rw8m7/image/upload";
const UPLOAD_PRESET = "unsigned_preset";

const SERVICE_TYPES = [
    { id: "tour", name: "Tour", icon: "🗺️", description: "Guided tours and sightseeing" },
    { id: "activity", name: "Activity", icon: "🎯", description: "Adventures and experiences" },
    { id: "transportation", name: "Transportation", icon: "🚗", description: "Travel and transfers" },
    { id: "food", name: "Food & Dining", icon: "🍽️", description: "Culinary experiences" },
    { id: "wellness", name: "Wellness", icon: "🧘", description: "Spa and relaxation" },
    { id: "entertainment", name: "Entertainment", icon: "🎭", description: "Shows and events" },
];

const DURATION_OPTIONS = [
    "30 minutes", "1 hour", "2 hours", "3 hours", "4 hours",
    "Half day (4-6 hours)", "Full day (8+ hours)", "Multiple days",
];

const STEPS = [
    { id: 1, title: "Service Type", description: "What kind of service do you offer?" },
    { id: 2, title: "Basic Info", description: "Tell us about your service" },
    { id: 3, title: "Details", description: "Duration, capacity, and location" },
    { id: 4, title: "What's Included", description: "What guests will experience" },
    { id: 5, title: "Photos", description: "Show your service" },
    { id: 6, title: "Pricing & Schedule", description: "Set your rates and availability" },
];

export default function AddServiceForm({onClose}) {
    const [currentStep, setCurrentStep] = useState(1);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [stepErrors, setStepErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [formData, setFormData] = useState({
        category: "service",
        type: "",
        title: "",
        description: "",
        location: "", // Keep for backward compatibility (text address)
        locationData: null, // New: { lat, lng, address }
        duration: "",
        maxGuests: "",
        minGuests: "1",
        included: "",
        notIncluded: "",
        requirements: "",
        cancellationPolicy: "",
        price: "",
        priceType: "per_person",
        availability: "daily",
        startTime: "",
        languages: "",
    });

    // Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // Cleanup image preview URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch (error) {
                    // Ignore errors when revoking URLs
                }
            });
        };
    }, [images]);

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

    const removeImage = (index) => {
        setImages((prev) => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const validateStep = (step) => {
        const errors = {};
        switch (step) {
            case 1:
                if (!formData.type) errors.type = "Please select a service type";
                break;
            case 2:
                if (!formData.title) errors.title = "Title is required";
                if (!formData.description) errors.description = "Description is required";
                break;
            case 3:
                if (!formData.locationData && !formData.location) {
                    errors.location = "Location is required. Please select a location on the map.";
                }
                if (!formData.duration) errors.duration = "Duration is required";
                if (!formData.maxGuests || formData.maxGuests <= 0)
                    errors.maxGuests = "Valid guest count required";
                break;
            case 4:
                if (!formData.included || formData.included.trim() === "") {
                    errors.included = "Please specify what's included";
                }
                break;
            case 5:
                if (images.length < REQUIRED_IMAGE_COUNT)
                    errors.images = `At least ${REQUIRED_IMAGE_COUNT} images required`;
                break;
            case 6:
                if (!formData.price || formData.price <= 0)
                    errors.price = "Valid price is required";
                if (!formData.startTime) errors.startTime = "Start time required";
                break;
            default:
                break;
        }
        setStepErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) setCurrentStep((p) => Math.min(p + 1, STEPS.length));
    };
    const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

    const uploadToCloudinary = async (file) => {
        try {
            const data = new FormData();
            data.append("file", file);
            data.append("upload_preset", UPLOAD_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
            
            if (!res.ok) {
                throw new Error(`Upload failed with status: ${res.status}`);
            }
            
            const json = await res.json();
            if (!json.secure_url) {
                throw new Error("No secure URL returned from Cloudinary");
            }
            
            return json.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw error;
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(6)) return;

        if (!currentUser) {
            setUploadError("You must be signed in to create a service.");
            return;
        }

        try {
            setLoading(true);
            setUploadError("");

            // Upload images to Cloudinary
            const uploadedUrls = [];
            for (const img of images) {
                try {
                    const url = await uploadToCloudinary(img.file);
                    uploadedUrls.push(url);
                } catch (error) {
                    console.error("Error uploading image:", error);
                    throw new Error(`Failed to upload image: ${error.message}`);
                }
            }

            // Prepare data for Firestore
            const finalData = {
                ...formData,
                price: Number(formData.price) || 0,
                maxGuests: Number(formData.maxGuests) || 0,
                minGuests: Number(formData.minGuests) || 1,
                // Process included items if they're separated by newlines
                included: formData.included ? formData.included.split('\n').filter(item => item.trim()) : [],
                notIncluded: formData.notIncluded ? formData.notIncluded.split('\n').filter(item => item.trim()) : [],
                requirements: formData.requirements ? formData.requirements.split('\n').filter(item => item.trim()) : [],
                languages: formData.languages ? formData.languages.split(',').map(lang => lang.trim()).filter(lang => lang) : [],
                // Store location data in Firestore
                location: formData.locationData ? {
                    lat: formData.locationData.lat,
                    lng: formData.locationData.lng,
                    address: formData.locationData.address
                } : (formData.location ? { address: formData.location } : null),
                images: uploadedUrls,
                ownerId: currentUser.uid,
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, "services"), finalData);
            setSuccess(true);
            
            // Clean up image preview URLs after successful upload
            images.forEach((img) => {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch (error) {
                    // Ignore errors
                }
            });

            // Close modal after a short delay to show success message
            setTimeout(() => {
                if (onClose) onClose();
            }, 1500);
        } catch (error) {
            console.error("Error creating service:", error);
            setUploadError(error.message || "Failed to create service. Please try again.");
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="host-form-grid host-form-grid-2">
                        {SERVICE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: type.name })}
                                className={`service-type-card ${formData.type === type.name ? "service-type-selected" : ""}`}
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
                                Service Title <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Enter service title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="host-form-input"
                            />
                            {stepErrors.title && <p className="host-form-error">{stepErrors.title}</p>}
                        </div>
                        <div className="host-form-group">
                            <label className="host-form-label">
                                Description <span className="required">*</span>
                            </label>
                            <textarea
                                placeholder="Describe your service in detail..."
                                rows={5}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="host-form-textarea"
                            />
                            {stepErrors.description && <p className="host-form-error">{stepErrors.description}</p>}
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
                                <option value="">Select duration</option>
                                {DURATION_OPTIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            {stepErrors.duration && <p className="host-form-error">{stepErrors.duration}</p>}
                        </div>
                        <div className="host-form-group">
                            <label className="host-form-label">
                                <Users size={16} style={{ marginRight: "4px" }} />
                                Max Guests <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Maximum number of guests"
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
                                What's Included <span className="required">*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="List what guests will experience (e.g., Guided tour, Equipment, Refreshments)"
                                value={formData.included}
                                onChange={(e) => setFormData({ ...formData, included: e.target.value })}
                                className="host-form-textarea"
                            />
                            {stepErrors.included && <p className="host-form-error">{stepErrors.included}</p>}
                        </div>
                        <div className="host-form-group">
                            <label className="host-form-label">Not Included (Optional)</label>
                            <textarea
                                rows={3}
                                placeholder="List what's not included (e.g., Transportation, Meals)"
                                value={formData.notIncluded}
                                onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                                className="host-form-textarea"
                            />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="host-form-group">
                        <label className="host-form-label">
                            Service Photos <span className="required">*</span>
                            <span className="host-form-subtitle" style={{ marginLeft: "8px" }}>
                                ({images.length} / {REQUIRED_IMAGE_COUNT} minimum, {MAX_IMAGE_COUNT} maximum)
                            </span>
                        </label>
                        <div className="host-image-preview-grid">
                            {images.map((img, idx) => (
                                <div key={idx} className="host-image-preview-item">
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
                    <div className="host-form-grid host-form-grid-2">
                        <div className="host-form-group">
                            <label className="host-form-label">
                                Price <span className="required">*</span>
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
                            <label className="host-form-label">
                                Start Time <span className="required">*</span>
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="host-form-input"
                            />
                            {stepErrors.startTime && <p className="host-form-error">{stepErrors.startTime}</p>}
                        </div>
                        {uploadError && (
                            <div className="host-form-group" style={{ gridColumn: "1 / -1" }}>
                                <p className="host-form-error">{uploadError}</p>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    if (success) {
        return (
            <div className="host-modal-form-container">
                <div className="host-modal-form-wrapper" style={{ textAlign: "center", padding: "3rem" }}>
                    <Check size={64} style={{ color: "#10b981", marginBottom: "1rem" }} />
                    <h2 className="host-modal-title" style={{ marginBottom: "0.5rem" }}>
                        Service Created Successfully!
                    </h2>
                    <p className="host-form-subtitle">Redirecting back...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="host-modal-form-container">
            <div className="host-modal-form-wrapper">
                <button
                    onClick={() => {
                        // Clean up image preview URLs before closing
                        images.forEach((img) => {
                            try {
                                URL.revokeObjectURL(img.preview);
                            } catch (error) {
                                // Ignore errors
                            }
                        });
                        if (onClose) onClose();
                    }}
                    className="host-modal-close-btn"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                <div className="host-modal-form">
                    <h2 className="host-modal-title">Create a Service</h2>

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
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="host-form-cancel-btn"
                            style={{ opacity: currentStep === 1 ? 0.5 : 1, cursor: currentStep === 1 ? "not-allowed" : "pointer" }}
                        >
                            <ArrowLeft size={18} style={{ marginRight: "8px" }} />
                            Back
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
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !currentUser}
                                className="host-form-submit-btn"
                                style={{ 
                                    background: (loading || !currentUser) ? "rgba(255, 255, 255, 0.2)" : "var(--primary-gradient)",
                                    cursor: (loading || !currentUser) ? "not-allowed" : "pointer"
                                }}
                            >
                                {loading ? "Uploading..." : "Create Service"}
                                {!loading && <Check size={18} style={{ marginLeft: "8px" }} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
