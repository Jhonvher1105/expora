import React, { useState, useCallback, useEffect, } from "react";
import { Plus, X } from "lucide-react";
import { auth, db } from "../../firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { Link, Navigate, useNavigate } from "react-router-dom";

const REQUIRED_IMAGE_COUNT = 5;
const MAX_IMAGE_COUNT = 10;
const PROPERTY_TYPES = ["Home", "Apartment", "Hotel", "Resort"];
const DAY_NIGHT = ["Day", "Night"];

// 🔹 Replace these with your Cloudinary details
const CLOUD_NAME = "dv42rw8m7";
const UPLOAD_PRESET = "unsigned_preset"; // <-- create in Cloudinary dashboard

export default function AddProperty({ onPropertyCreated, onClose }) {
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [accType, setAccType] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "",
        category: "home",
        price: "",
        day_night: "",
        location: "",
        maxGuests: "",
        bedrooms: "",
        bathrooms: "",
        amenities: "",
        discountPercentage: "",
        promoCode: "",
        promoStartDate: "",
        promoEndDate: "",
        isDraft: false,
    });

    // 🔹 Handle image upload and preview
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        if (images.length + files.length > MAX_IMAGE_COUNT) {
            setUploadError(`Maximum ${MAX_IMAGE_COUNT} images allowed.`);
            return;
        }

        const validFiles = files.filter((file) => {
            const isValid = file.type.startsWith("image/");
            const isUnderLimit = file.size <= 3 * 1024 * 1024; // 3MB limit
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
        setUploadError(
            images.length + newImages.length < REQUIRED_IMAGE_COUNT
                ? `Please add at least ${REQUIRED_IMAGE_COUNT} images (${REQUIRED_IMAGE_COUNT - (images.length + newImages.length)} more needed)`
                : ""
        );
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

    // 🔹 Upload each image to Cloudinary
    const uploadImagesToCloudinary = async () => {
        const uploadedUrls = [];
        for (const image of images) {
            const formData = new FormData();
            formData.append("file", image.file);
            formData.append("upload_preset", UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to upload to Cloudinary");
            const data = await res.json();
            uploadedUrls.push(data.secure_url);
        }
        return uploadedUrls;
    };

    // 🔹 Listen to auth changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            // Load draft if exists
            if (user) {
                const draftKey = `property_draft_${user.uid}`;
                const saved = localStorage.getItem(draftKey);
                if (saved) {
                    try {
                        const draft = JSON.parse(saved);
                        // Note: Images can't be restored from localStorage (File objects)
                        if (draft.hasDraft) {
                            const restore = window.confirm("Restore saved draft?");
                            if (restore) {
                                setFormData(draft.formData);
                            } else {
                                localStorage.removeItem(draftKey);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to load draft:", e);
                    }
                }
            }
        });
        return unsubscribe;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 🔹 Cleanup previews
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch { }
            });
        };
    }, [images]);

    // 🔹 Form Validation
    const validateForm = useCallback(() => {
        const errors = {};
        if (!formData.title) errors.title = "Title is required";
        if (!formData.description) errors.description = "Description is required";
        if (!formData.type) errors.type = "Property type is required";
        if (!formData.price || formData.price <= 0)
            errors.price = "Valid price is required";
        if (!formData.location) errors.location = "Location is required";
        if (!formData.maxGuests || formData.maxGuests <= 0)
            errors.maxGuests = "Valid guest count is required";
        if (!formData.bedrooms || formData.bedrooms < 0)
            errors.bedrooms = "Valid bedroom count is required";
        if (!formData.bathrooms || formData.bathrooms < 0)
            errors.bathrooms = "Valid bathroom count is required";
        if (images.length < REQUIRED_IMAGE_COUNT)
            errors.images = `At least ${REQUIRED_IMAGE_COUNT} images are required`;

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, images]);

    // 🔹 Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!currentUser) {
            setUploadError("You must be signed in to create a property.");
            return;
        }

        try {
            setIsUploading(true);
            const cloudinaryUrls = await uploadImagesToCloudinary();

            const finalData = {
                ...formData,
                price: Number(formData.price),
                maxGuests: Number(formData.maxGuests),
                bedrooms: Number(formData.bedrooms),
                bathrooms: Number(formData.bathrooms),
                amenities: formData.amenities.split(",").map((a) => a.trim()),
                discountPercentage: formData.discountPercentage ? Number(formData.discountPercentage) : null,
                promoCode: formData.promoCode || null,
                promoStartDate: formData.promoStartDate || null,
                promoEndDate: formData.promoEndDate || null,
                images: cloudinaryUrls,
                ownerId: currentUser.uid,
                createdAt: new Date(),
                isDraft: false,
            };

            await addDoc(collection(db, "properties"), finalData);
            console.log("✅ Property saved:", finalData);

            // Clear draft after successful submission
            if (currentUser) {
                const draftKey = `property_draft_${currentUser.uid}`;
                localStorage.removeItem(draftKey);
            }

            if (accType) {
                await updateDoc(doc(db, "users", currentUser.uid), { accType });
                console.log("Account type updated:", accType);
            }

            if (onPropertyCreated) onPropertyCreated(finalData);
            if (onClose) onClose();
        } catch (error) {
            console.error("❌ Error creating property:", error);
            setUploadError("Failed to create property. Please try again.");
        } finally {
            Navigate("/HostPage");
            setIsUploading(false);

        }
    };

    return (
        <div className="host-modal-form-container">
            <div className="host-modal-form-wrapper">

                <form onSubmit={handleSubmit} className="host-modal-form">
                    <h2 className="host-modal-title">Create New Property Listing</h2>

                    {/* Basic Information Section */}
                    <section className="host-form-section">
                        <h3 className="host-form-section-title">Basic Information</h3>
                        
                        <div className="host-form-group">
                            <label className="host-form-label">
                                Title <span className="required">*</span>
                            </label>
                            <input
                                className="host-form-input"
                                type="text"
                                placeholder="Enter property title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            {formErrors.title && <p className="host-form-error">{formErrors.title}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                Description <span className="required">*</span>
                            </label>
                            <textarea
                                className="host-form-textarea"
                                rows={4}
                                placeholder="Describe your property..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            {formErrors.description && (
                                <p className="host-form-error">{formErrors.description}</p>
                            )}
                        </div>

                        <div className="host-form-grid host-form-grid-2">
                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Type <span className="required">*</span>
                                </label>
                                <select
                                    className="host-form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="">Select type...</option>
                                    {PROPERTY_TYPES.map((t) => (
                                        <option key={t} value={t.toLowerCase()}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.type && <p className="host-form-error">{formErrors.type}</p>}
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Day or Night <span className="required">*</span>
                                </label>
                                <select
                                    className="host-form-select"
                                    value={formData.day_night}
                                    onChange={(e) => setFormData({ ...formData, day_night: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    {DAY_NIGHT.map((t) => (
                                        <option key={t} value={t.toLowerCase()}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Location & Pricing Section */}
                    <section className="host-form-section">
                        <h3 className="host-form-section-title">Location & Pricing</h3>
                        
                        <div className="host-form-group">
                            <label className="host-form-label">
                                Location <span className="required">*</span>
                            </label>
                            <input
                                className="host-form-input"
                                type="text"
                                placeholder="Enter property location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                            {formErrors.location && <p className="host-form-error">{formErrors.location}</p>}
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">
                                Price per Night <span className="required">*</span>
                            </label>
                            <input
                                className="host-form-input"
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                            {formErrors.price && <p className="host-form-error">{formErrors.price}</p>}
                        </div>
                    </section>

                    {/* Property Details Section */}
                    <section className="host-form-section">
                        <h3 className="host-form-section-title">Property Details</h3>
                        
                        <div className="host-form-grid host-form-grid-3">
                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Max Guests <span className="required">*</span>
                                </label>
                                <input
                                    className="host-form-input"
                                    type="number"
                                    placeholder="0"
                                    min="1"
                                    value={formData.maxGuests}
                                    onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                />
                                {formErrors.maxGuests && <p className="host-form-error">{formErrors.maxGuests}</p>}
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Bedrooms <span className="required">*</span>
                                </label>
                                <input
                                    className="host-form-input"
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={formData.bedrooms}
                                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                                />
                                {formErrors.bedrooms && <p className="host-form-error">{formErrors.bedrooms}</p>}
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">
                                    Bathrooms <span className="required">*</span>
                                </label>
                                <input
                                    className="host-form-input"
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={formData.bathrooms}
                                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                                />
                                {formErrors.bathrooms && <p className="host-form-error">{formErrors.bathrooms}</p>}
                            </div>
                        </div>

                        <div className="host-form-group">
                            <label className="host-form-label">Amenities</label>
                            <input
                                className="host-form-input"
                                type="text"
                                placeholder="WiFi, Pool, Parking, etc. (comma separated)"
                                value={formData.amenities}
                                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                            />
                        </div>
                    </section>

                    {/* Images Section */}
                    <section className="host-form-section">
                        <h3 className="host-form-section-title">
                            Property Images <span className="host-form-subtitle">(5–10 images required)</span>
                        </h3>
                        
                        <div className="host-image-upload-area">
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
                                            className="host-image-remove-btn"
                                            onClick={() => removeImage(idx)}
                                            aria-label="Remove image"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}

                                <label className="host-image-upload-btn">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        className="host-image-input-hidden"
                                    />
                                    <Plus size={24} className="host-image-upload-icon" />
                                    <span className="host-image-upload-text">Add Images</span>
                                </label>
                            </div>
                            
                            {uploadError && <p className="host-form-error">{uploadError}</p>}
                            {formErrors.images && <p className="host-form-error">{formErrors.images}</p>}
                            <p className="host-image-count">
                                {images.length} / {MAX_IMAGE_COUNT} images ({images.length < REQUIRED_IMAGE_COUNT ? `${REQUIRED_IMAGE_COUNT - images.length} more needed` : 'Minimum reached'})
                            </p>
                        </div>
                    </section>

                    {/* Discounts & Promotions Section */}
                    <section className="host-form-section">
                        <h3 className="host-form-section-title">Discounts & Promotions <span className="host-form-subtitle">(Optional)</span></h3>
                        
                        <div className="host-form-grid host-form-grid-2">
                            <div className="host-form-group">
                                <label className="host-form-label">Discount Percentage</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="host-form-input"
                                    placeholder="e.g., 20"
                                    value={formData.discountPercentage}
                                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                                />
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">Promo Code</label>
                                <input
                                    type="text"
                                    className="host-form-input"
                                    placeholder="e.g., SUMMER2024"
                                    value={formData.promoCode}
                                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">Promo Start Date</label>
                                <input
                                    type="date"
                                    className="host-form-input"
                                    value={formData.promoStartDate}
                                    onChange={(e) => setFormData({ ...formData, promoStartDate: e.target.value })}
                                />
                            </div>

                            <div className="host-form-group">
                                <label className="host-form-label">Promo End Date</label>
                                <input
                                    type="date"
                                    className="host-form-input"
                                    value={formData.promoEndDate}
                                    onChange={(e) => setFormData({ ...formData, promoEndDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Form Actions */}
                    <div className="host-form-actions">
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="host-form-submit-btn"
                        >
                            {isUploading ? "Uploading..." : "Create Listing"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!currentUser) {
                                    alert("Please sign in to save draft.");
                                    return;
                                }
                                const draftKey = `property_draft_${currentUser.uid}`;
                                localStorage.setItem(draftKey, JSON.stringify({
                                    formData,
                                    hasDraft: true,
                                    savedAt: new Date().toISOString(),
                                }));
                                alert("Draft saved! You can continue later.");
                            }}
                            className="host-form-draft-btn"
                        >
                            Save Draft
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="host-form-cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
