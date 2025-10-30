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
        category: "",
        price: "",
        day_night: "",
        location: "",
        maxGuests: "",
        bedrooms: "",
        bathrooms: "",
        amenities: "",
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
        });
        return unsubscribe;
    }, []);

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
        if (!formData.category) errors.category = "Category is required";
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
                images: cloudinaryUrls,
                ownerId: currentUser.uid,
                createdAt: new Date(),
            };

            await addDoc(collection(db, "properties"), finalData);
            console.log("✅ Property saved:", finalData);

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                        Create New Property Listing
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Fill in the details below to list your property
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Property Title */}
                    <div>
                        <label className="block text-sm font-medium">Title</label>
                        <input
                            className="w-full p-2 border rounded"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium">Description</label>
                        <textarea
                            className="w-full p-2 border rounded"
                            rows={4}
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                        />
                        {formErrors.description && (
                            <p className="text-red-500 text-sm">{formErrors.description}</p>
                        )}
                    </div>

                    {/* Type & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Type</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value })
                                }
                            >
                                <option value="">Select type...</option>
                                {PROPERTY_TYPES.map((t) => (
                                    <option key={t} value={t.toLowerCase()}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Category</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData({ ...formData, category: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    {/* Other Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="price-day_night  grid grid-cols-2 gap4">
                            <input
                                className="p-2 border rounded"
                                placeholder="Price"
                                type="number"
                                value={formData.price}
                                onChange={(e) =>
                                    setFormData({ ...formData, price: e.target.value })
                                }
                            />
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.day_night}
                                onChange={(e) =>
                                    setFormData({ ...formData, day_night: e.target.value })
                                }
                            >
                                <option value="">Day or Night</option>
                                {DAY_NIGHT.map((t) => (
                                    <option key={t} value={t.toLowerCase()}>
                                        {t}  
                                    </option>
                                ))}
                            </select>
                        </div>
                        <input
                            className="p-2 border rounded"
                            placeholder="Location"
                            value={formData.location}
                            onChange={(e) =>
                                setFormData({ ...formData, location: e.target.value })
                            }
                        />

                        <input
                            className="p-2 border rounded"
                            placeholder="Max Guests"
                            type="number"
                            value={formData.maxGuests}
                            onChange={(e) =>
                                setFormData({ ...formData, maxGuests: e.target.value })
                            }
                        />
                        <input
                            className="p-2 border rounded"
                            placeholder="Bedrooms"
                            type="number"
                            value={formData.bedrooms}
                            onChange={(e) =>
                                setFormData({ ...formData, bedrooms: e.target.value })
                            }
                        />
                        <input
                            className="p-2 border rounded"
                            placeholder="Bathrooms"
                            type="number"
                            value={formData.bathrooms}
                            onChange={(e) =>
                                setFormData({ ...formData, bathrooms: e.target.value })
                            }
                        />
                        <input
                            className="p-2 border rounded"
                            placeholder="Amenities (comma separated)"
                            value={formData.amenities}
                            onChange={(e) =>
                                setFormData({ ...formData, amenities: e.target.value })
                            }
                        />
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Property Images (5–10 images)
                        </label>
                        <div className="flex flex-wrap gap-3 mb-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative">
                                    <img
                                        src={img.preview}
                                        alt=""
                                        className="w-24 h-24 object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                        onClick={() => removeImage(idx)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            <label className="w-24 h-24 border-2 border-dashed flex flex-col items-center justify-center rounded cursor-pointer hover:bg-gray-50">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <Plus size={24} className="text-gray-400" />
                                <span className="text-sm text-gray-500">Add</span>
                            </label>
                        </div>
                        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isUploading ? "Uploading..." : "Create Listing"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
