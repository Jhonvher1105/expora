import React, { useState, useCallback, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { auth, db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const REQUIRED_IMAGE_COUNT = 5;
const PROPERTY_TYPES = ["Home", "Apartment", "Hotel", "Resort", "Tour"];

export default function AddProperty({ onPropertyCreated, onClose }) {
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);
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
        location: "",
        maxGuests: "",
        bedrooms: "",
        bathrooms: "",
        amenities: "",
        images: [],
    });

    // 🔹 Handle image upload and convert to Base64
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        const validFiles = files.filter((file) => {
            const isValid = file.type.startsWith("image/");
            const isUnderLimit = file.size <= 2 * 1024 * 1024; // 2MB limit (optional)
            return isValid && isUnderLimit;
        });

        if (validFiles.length !== files.length) {
            setUploadError("Some files were skipped. Must be valid images under 2MB.");
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

        setUploadError(
            images.length - 1 < REQUIRED_IMAGE_COUNT
                ? `Please add at least ${REQUIRED_IMAGE_COUNT} images (${REQUIRED_IMAGE_COUNT - (images.length - 1)} more needed)`
                : ""
        );
    };

    // 🔹 Convert image files to Base64
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    // 🔹 "Upload" images (convert to Base64)
    const uploadImages = async () => {
        setIsUploading(true);
        const urls = [];

        try {
            for (const image of images) {
                const base64 = await convertToBase64(image.file);
                urls.push(base64);
            }
            setImageUrls(urls);
            return urls;
        } catch (error) {
            console.error("Error converting images:", error);
            setUploadError("Failed to process images. Please try again.");
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    // 🔹 Listen to Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    // revoke object URLs on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            images.forEach((img) => {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch (e) {
                    // ignore
                }
            });
        };
    }, [images]);

    // 🔹 Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        // ensure user is logged in
        if (!currentUser) {
            setUploadError("You must be signed in to create a property.");
            return;
        }

        try {
            setIsUploading(true);
            const urls = await uploadImages();
            const finalData = { ...formData, images: urls };
            console.log("Creating property:", finalData);

            const uid = currentUser?.uid;
            if (uid) {
                try {
                    // only update accType if provided
                    if (accType) {
                        await updateDoc(doc(db, "users", uid), {
                            accType: accType,
                        });
                        console.log("Account type updated:", accType);
                    }
                } catch (uErr) {
                    console.warn("Failed to update user account type:", uErr);
                }
            }

            if (onPropertyCreated) onPropertyCreated(finalData);
            // close the form after successful creation
            if (onClose) onClose();
        } catch (error) {
            console.error("Error creating property:", error);
            setUploadError("Failed to create property. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // 🔹 Form validation
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

    // 🔹 UI
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
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium">
                            Property Title
                        </label>
                        <input
                            id="title"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Luxury Beachfront Villa"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            required
                        />
                        {formErrors.title && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label htmlFor="description" className="block text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            id="description"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe your property..."
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            rows={4}
                            required
                        />
                        {formErrors.description && (
                            <p className="text-red-500 text-sm mt-1">
                                {formErrors.description}
                            </p>
                        )}
                    </div>

                    {/* Property Type & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="type">Property Type</label>
                            <select
                                id="type"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value })
                                }
                                required
                            >
                                <option value="">Select type...</option>
                                {PROPERTY_TYPES.map((type) => (
                                    <option key={type.toLowerCase()} value={type.toLowerCase()}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                            {formErrors.type && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.type}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="category" className="block text-sm font-medium">
                                Category
                            </label>
                            <input
                                id="category"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Villa, Cabin, Tour"
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData({ ...formData, category: e.target.value })
                                }
                                required
                            />
                            {formErrors.category && (
                                <p className="text-red-500 text-sm mt-1">
                                    {formErrors.category}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Price & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="price" className="block text-sm font-medium">
                                Price per Night ($)
                            </label>
                            <input
                                id="price"
                                type="number"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="150"
                                value={formData.price}
                                onChange={(e) =>
                                    setFormData({ ...formData, price: Number(e.target.value) })
                                }
                                min="0"
                                required
                            />
                            {formErrors.price && (
                                <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="location" className="block text-sm font-medium">
                                Location
                            </label>
                            <input
                                id="location"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="City, State/Country"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({ ...formData, location: e.target.value })
                                }
                                required
                            />
                            {formErrors.location && (
                                <p className="text-red-500 text-sm mt-1">
                                    {formErrors.location}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium">
                                Property Images (Minimum {REQUIRED_IMAGE_COUNT})
                            </label>
                            <span className="text-sm text-gray-500">
                                {images.length} / {REQUIRED_IMAGE_COUNT} minimum
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4">
                            {images.map((image, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={image.preview}
                                        alt={`Preview ${index + 1}`}
                                        className="w-24 h-24 object-cover rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
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

                        {uploadError && (
                            <p className="text-red-500 text-sm">{uploadError}</p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-6">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                            disabled={isUploading || images.length < REQUIRED_IMAGE_COUNT}
                        >
                            {isUploading ? "Processing..." : "Create Listing"}
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 border rounded hover:bg-gray-50"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
