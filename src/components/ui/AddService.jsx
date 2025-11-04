import React, { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

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
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState("");
    const [stepErrors, setStepErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        category: "service",
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
        priceType: "per_person",
        availability: "daily",
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
                    errors.maxGuests = "Valid guest count required";
                break;
            case 4:
                if (!formData.included) errors.included = "Please specify what's included";
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
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
        const json = await res.json();
        return json.secure_url;
    };

    const handleSubmit = async () => {
        if (!validateStep(6)) return;
        try {
            setLoading(true);
            const uploadedUrls = [];
            for (const img of images) {
                const url = await uploadToCloudinary(img.file);
                uploadedUrls.push(url);
            }
            await addDoc(collection(db, "services"), {
                ...formData,
                images: uploadedUrls,
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            if(onClose) onClose();
        } catch (e) {
            alert("❌ Error creating service");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="grid sm:grid-cols-2 gap-6">
                        {SERVICE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setFormData({ ...formData, type: type.name })}
                                className={`p-6 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${formData.type === type.name
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-gray-200 hover:border-blue-400"
                                    }`}
                            >
                                <span className="text-4xl">{type.icon}</span>
                                <span className="font-semibold">{type.name}</span>
                                <p className="text-sm text-gray-500">{type.description}</p>
                            </button>
                        ))}
                        {stepErrors.type && <p className="text-red-500 text-sm">{stepErrors.type}</p>}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Service title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full border rounded-lg p-3"
                        />
                        <textarea
                            placeholder="Describe your service"
                            rows={5}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border rounded-lg p-3"
                        />
                        {Object.values(stepErrors).map((err) => (
                            <p key={err} className="text-red-500 text-sm">{err}</p>
                        ))}
                    </div>
                );
            case 3:
                return (
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-2 text-gray-700 mb-1">
                                <MapPin size={16} /> Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full border rounded-lg p-3"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 mb-1">
                                <Clock size={16} /> Duration
                            </label>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full border rounded-lg p-3"
                            >
                                <option value="">Select duration</option>
                                {DURATION_OPTIONS.map((d) => (
                                    <option key={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-gray-700 mb-1">
                                <Users size={16} /> Max Guests
                            </label>
                            <input
                                type="number"
                                value={formData.maxGuests}
                                onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                className="w-full border rounded-lg p-3"
                            />
                        </div>
                        {Object.values(stepErrors).map((err) => (
                            <p key={err} className="text-red-500 text-sm">{err}</p>
                        ))}
                    </div>
                );
            case 4:
                return (
                    <div className="grid gap-4">
                        <textarea
                            rows={4}
                            placeholder="What's included?"
                            value={formData.included}
                            onChange={(e) => setFormData({ ...formData, included: e.target.value })}
                            className="w-full border rounded-lg p-3"
                        />
                        <textarea
                            rows={3}
                            placeholder="Not included (optional)"
                            value={formData.notIncluded}
                            onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                            className="w-full border rounded-lg p-3"
                        />
                        {Object.values(stepErrors).map((err) => (
                            <p key={err} className="text-red-500 text-sm">{err}</p>
                        ))}
                    </div>
                );
            case 5:
                return (
                    <div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative">
                                    <img
                                        src={img.preview}
                                        alt="preview"
                                        className="rounded-lg object-cover w-full h-32"
                                    />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            {images.length < MAX_IMAGE_COUNT && (
                                <label className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-32 cursor-pointer hover:border-blue-400">
                                    <Plus />
                                    <span className="text-sm text-gray-500">Add Photo</span>
                                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
                        {stepErrors.images && <p className="text-red-500 text-sm">{stepErrors.images}</p>}
                    </div>
                );
            case 6:
                return (
                    <div className="grid sm:grid-cols-2 gap-4">
                        <input
                            type="number"
                            placeholder="Price"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="border rounded-lg p-3"
                        />
                        <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            className="border rounded-lg p-3"
                        />
                        {Object.values(stepErrors).map((err) => (
                            <p key={err} className="text-red-500 text-sm">{err}</p>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-gray-50">
                <Check size={64} className="text-green-500 mb-4 animate-bounce" />
                <h2 className="text-2xl font-semibold text-gray-800">
                    Service Created Successfully!
                </h2>
                <p className="text-gray-500 mt-2">Redirecting back...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-50 py-8 px-4 sm:px-6 lg:px-8 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 bg-white shadow-md p-2 rounded-full hover:bg-gray-100 transition"
            >
                <X className="w-5 h-5 text-gray-700" />
            </button>

            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Create a Service
                    </h1>
                    <p className="text-gray-600">
                        Share your expertise and experiences with travelers
                    </p>
                </div>

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

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">
                            {STEPS[currentStep - 1].title}
                        </h2>
                        <p className="text-gray-600 mt-2">
                            {STEPS[currentStep - 1].description}
                        </p>
                    </div>

                    <div className="min-h-[400px]">{renderStep()}</div>

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
                                disabled={loading}
                                className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium shadow-lg transition-colors ${loading
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                    }`}
                            >
                                {loading ? "Uploading..." : "Create Service"}
                                {!loading && <Check size={20} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
