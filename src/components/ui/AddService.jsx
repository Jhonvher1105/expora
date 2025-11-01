import React, { useState } from "react";
import { Plus, X, ArrowLeft, ArrowRight, Check, Clock, Users, MapPin } from "lucide-react";

const REQUIRED_IMAGE_COUNT = 3;
const MAX_IMAGE_COUNT = 8;
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
    "Half day (4-6 hours)", "Full day (8+ hours)", "Multiple days"
];

const STEPS = [
    { id: 1, title: "Service Type", description: "What kind of service do you offer?" },
    { id: 2, title: "Basic Info", description: "Tell us about your service" },
    { id: 3, title: "Details", description: "Duration, capacity, and location" },
    { id: 4, title: "What's Included", description: "What guests will experience" },
    { id: 5, title: "Photos", description: "Show your service" },
    { id: 6, title: "Pricing & Schedule", description: "Set your rates and availability" },
];

export default function AddServiceForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [stepErrors, setStepErrors] = useState({});

    const [formData, setFormData] = useState({
        type: "",
        title: "",
        description: "",
        location: "",
        duration: "",
        maxGuests: "",
        minGuests: "1",
        included: "",
        notIncluded: "",
        requirements: "",
        cancellationPolicy: "",
        price: "",
        priceType: "per_person", // per_person, per_group, per_hour
        availability: "daily", // daily, weekends, custom
        startTime: "",
        languages: "",
    });

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
                if (!formData.location) errors.location = "Location is required";
                if (!formData.duration) errors.duration = "Duration is required";
                if (!formData.maxGuests || formData.maxGuests <= 0)
                    errors.maxGuests = "Valid guest count is required";
                break;
            case 4:
                if (!formData.included) errors.included = "Please specify what's included";
                break;
            case 5:
                if (images.length < REQUIRED_IMAGE_COUNT)
                    errors.images = `At least ${REQUIRED_IMAGE_COUNT} images are required`;
                break;
            case 6:
                if (!formData.price || formData.price <= 0)
                    errors.price = "Valid price is required";
                if (!formData.startTime) errors.startTime = "Start time is required";
                break;
        }

        setStepErrors(errors);
        return Object.keys(errors).length === 0;
    };

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

    const handleSubmit = () => {
        if (!validateStep(6)) return;

        console.log("Service submitted:", {
            ...formData,
            images: images.map(img => img.preview),
        });
        alert("Service created! (In your app, this would upload to Firebase)");
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SERVICE_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={`p-6 border-2 rounded-xl text-left transition-all ${formData.type === type.id
                                            ? "border-blue-600 bg-blue-50 shadow-md"
                                            : "border-gray-200 hover:border-gray-300 hover:shadow"
                                        }`}
                                >
                                    <div className="text-3xl mb-2">{type.icon}</div>
                                    <h3 className="text-xl font-semibold mb-1">{type.name}</h3>
                                    <p className="text-sm text-gray-600">{type.description}</p>
                                </button>
                            ))}
                        </div>
                        {stepErrors.type && <p className="text-red-500 text-sm">{stepErrors.type}</p>}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Service Title</label>
                            <input
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Island Hopping Adventure"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            {stepErrors.title && <p className="text-red-500 text-sm mt-1">{stepErrors.title}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={6}
                                placeholder="Describe your service in detail. What makes it special? What will guests experience?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            {stepErrors.description && (
                                <p className="text-red-500 text-sm mt-1">{stepErrors.description}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Languages Offered</label>
                            <input
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., English, Spanish, Filipino"
                                value={formData.languages}
                                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Separate multiple languages with commas</p>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                <MapPin className="inline w-4 h-4 mr-1" />
                                Location / Meeting Point
                            </label>
                            <input
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., City Center, Hotel Pickup Available"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                            {stepErrors.location && (
                                <p className="text-red-500 text-sm mt-1">{stepErrors.location}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                <Clock className="inline w-4 h-4 mr-1" />
                                Duration
                            </label>
                            <select
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            >
                                <option value="">Select duration...</option>
                                {DURATION_OPTIONS.map((duration) => (
                                    <option key={duration} value={duration}>
                                        {duration}
                                    </option>
                                ))}
                            </select>
                            {stepErrors.duration && (
                                <p className="text-red-500 text-sm mt-1">{stepErrors.duration}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    <Users className="inline w-4 h-4 mr-1" />
                                    Min Guests
                                </label>
                                <input
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type="number"
                                    min="1"
                                    value={formData.minGuests}
                                    onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Max Guests</label>
                                <input
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type="number"
                                    min="1"
                                    value={formData.maxGuests}
                                    onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                />
                                {stepErrors.maxGuests && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.maxGuests}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">What's Included</label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Equipment, meals, transportation, guide, etc. (one per line)"
                                value={formData.included}
                                onChange={(e) => setFormData({ ...formData, included: e.target.value })}
                            />
                            {stepErrors.included && (
                                <p className="text-red-500 text-sm mt-1">{stepErrors.included}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">What's NOT Included</label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                                placeholder="Personal expenses, tips, additional meals, etc. (one per line)"
                                value={formData.notIncluded}
                                onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Requirements / What to Bring</label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                                placeholder="Comfortable shoes, sunscreen, valid ID, etc."
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Cancellation Policy</label>
                            <select
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.cancellationPolicy}
                                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                            >
                                <option value="">Select policy...</option>
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
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Upload at least {REQUIRED_IMAGE_COUNT} photos (max {MAX_IMAGE_COUNT})
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={img.preview}
                                            alt=""
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeImage(idx)}
                                        >
                                            <X size={16} />
                                        </button>
                                        {idx === 0 && (
                                            <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                                Cover Photo
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {images.length < MAX_IMAGE_COUNT && (
                                    <label className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <Plus size={32} className="text-gray-400" />
                                        <span className="text-sm text-gray-500 mt-2">Add Photos</span>
                                    </label>
                                )}
                            </div>
                            {stepErrors.images && (
                                <p className="text-red-500 text-sm mt-2">{stepErrors.images}</p>
                            )}
                            {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                            <p className="text-xs text-gray-500 mt-2">
                                First photo will be the cover image
                            </p>
                        </div>
                    </div>
                );

            case 6:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500 text-lg">$</span>
                                    <input
                                        className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                                        type="number"
                                        min="1"
                                        placeholder="50"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                {stepErrors.price && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.price}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Price Type</label>
                                <select
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={formData.priceType}
                                    onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                                >
                                    <option value="per_person">Per Person</option>
                                    <option value="per_group">Per Group</option>
                                    <option value="per_hour">Per Hour</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Availability</label>
                                <select
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={formData.availability}
                                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekends">Weekends Only</option>
                                    <option value="weekdays">Weekdays Only</option>
                                    <option value="custom">Custom Schedule</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Start Time</label>
                                <input
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                                {stepErrors.startTime && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.startTime}</p>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl border border-blue-100">
                            <h3 className="font-semibold text-lg mb-4 text-gray-900">Service Summary</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-medium capitalize">
                                        {SERVICE_TYPES.find(t => t.id === formData.type)?.name || "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Title:</span>
                                    <span className="font-medium truncate ml-4">{formData.title || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Location:</span>
                                    <span className="font-medium">{formData.location || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-medium">{formData.duration || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Capacity:</span>
                                    <span className="font-medium">
                                        {formData.minGuests || "1"}-{formData.maxGuests || "—"} guests
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Photos:</span>
                                    <span className="font-medium">{images.length} uploaded</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-blue-100 -mx-6 px-6 mt-4 rounded-lg">
                                    <span className="text-gray-700 font-medium">Price:</span>
                                    <span className="font-bold text-lg text-blue-600">
                                        ${formData.price || "0"} / {formData.priceType.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Create a Service</h1>
                    <p className="text-gray-600">Share your expertise and experiences with travelers</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {STEPS.map((step, idx) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep > step.id
                                                ? "bg-green-500 text-white"
                                                : currentStep === step.id
                                                    ? "bg-blue-600 text-white ring-4 ring-blue-200"
                                                    : "bg-gray-200 text-gray-500"
                                            }`}
                                    >
                                        {currentStep > step.id ? <Check size={20} /> : step.id}
                                    </div>
                                    <span className="text-xs mt-2 text-center hidden md:block max-w-[80px]">
                                        {step.title}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 transition-all ${currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">
                            {STEPS[currentStep - 1].title}
                        </h2>
                        <p className="text-gray-600 mt-2">{STEPS[currentStep - 1].description}</p>
                    </div>

                    <div className="min-h-[400px]">
                        {renderStep()}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="flex items-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft size={20} />
                            Back
                        </button>

                        {currentStep < STEPS.length ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Next
                                <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
                            >
                                Create Service
                                <Check size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}