// AddExperience.jsx
// Complete React Component for Adding Experiences
// Copy this entire file to your project

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowLeft, ArrowRight, Check, Clock, Users, MapPin, Star, Award } from "lucide-react";
import { auth, db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

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
        location: "",
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
                if (!formData.location) errors.location = "Location is required";
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {EXPERIENCE_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={`p-6 border rounded-xl text-left transition-all ${formData.type === type.id
                                        ? "border-[#ff6b35] bg-gradient-to-br from-[#ff6b35]/10 to-[#f7931e]/10 shadow-lg shadow-[#ff6b35]/20"
                                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                                        }`}
                                >
                                    <div className="text-3xl mb-3">{type.icon}</div>
                                    <h3 className="text-xl font-semibold mb-1 text-white">{type.name}</h3>
                                    <p className="text-sm text-white/60">{type.description}</p>
                                </button>
                            ))}
                        </div>
                        {stepErrors.type && <p className="text-red-400 text-sm">{stepErrors.type}</p>}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Experience Title</label>
                            <input
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                placeholder="e.g., Sunset Kayaking Adventure"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            {stepErrors.title && <p className="text-red-400 text-sm mt-1">{stepErrors.title}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Catchy Tagline</label>
                            <input
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                placeholder="e.g., Paddle through pristine waters at golden hour"
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                            />
                            {stepErrors.tagline && <p className="text-red-400 text-sm mt-1">{stepErrors.tagline}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Full Description</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={6}
                                placeholder="Describe your experience in detail. What makes it unique? What will guests feel and learn?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            {stepErrors.description && <p className="text-red-400 text-sm mt-1">{stepErrors.description}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Languages Offered</label>
                            <input
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                placeholder="e.g., English, Spanish, Filipino"
                                value={formData.languages}
                                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                            />
                            <p className="text-xs text-white/60 mt-1">Separate multiple languages with commas</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">About the Host</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={3}
                                placeholder="Tell guests about yourself and your expertise..."
                                value={formData.hostInfo}
                                onChange={(e) => setFormData({ ...formData, hostInfo: e.target.value })}
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">
                                <MapPin className="inline w-4 h-4 mr-1" />
                                Location / Meeting Point
                            </label>
                            <input
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                placeholder="e.g., Manila Bay, Hotel Pickup Available"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                            {stepErrors.location && <p className="text-red-400 text-sm mt-1">{stepErrors.location}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">
                                    <Clock className="inline w-4 h-4 mr-1" />
                                    Duration
                                </label>
                                <select
                                    className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                >
                                    <option value="">Select duration...</option>
                                    {DURATION_OPTIONS.map((duration) => (
                                        <option key={duration} value={duration}>{duration}</option>
                                    ))}
                                </select>
                                {stepErrors.duration && <p className="text-red-400 text-sm mt-1">{stepErrors.duration}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">
                                    <Award className="inline w-4 h-4 mr-1" />
                                    Skill Level
                                </label>
                                <select
                                    className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                    value={formData.skillLevel}
                                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                                >
                                    <option value="">Select level...</option>
                                    {SKILL_LEVELS.map((level) => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                                {stepErrors.skillLevel && <p className="text-red-400 text-sm mt-1">{stepErrors.skillLevel}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">
                                    <Users className="inline w-4 h-4 mr-1" />
                                    Min Guests
                                </label>
                                <input
                                    className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                    type="number"
                                    min="1"
                                    value={formData.minGuests}
                                    onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">Max Guests</label>
                                <input
                                    className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                    type="number"
                                    min="1"
                                    value={formData.maxGuests}
                                    onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                />
                                {stepErrors.maxGuests && <p className="text-red-400 text-sm mt-1">{stepErrors.maxGuests}</p>}
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">
                                <Star className="inline w-4 h-4 mr-1 text-[#ff6b35]" />
                                Experience Highlights
                            </label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={4}
                                placeholder="List the best parts of your experience (one per line)"
                                value={formData.highlights}
                                onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                            />
                            {stepErrors.highlights && <p className="text-red-400 text-sm mt-1">{stepErrors.highlights}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Itinerary (Optional)</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={5}
                                placeholder="Step-by-step schedule of your experience"
                                value={formData.itinerary}
                                onChange={(e) => setFormData({ ...formData, itinerary: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">What's Included</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={4}
                                placeholder="Equipment, guide, snacks, transportation, photos, etc. (one per line)"
                                value={formData.included}
                                onChange={(e) => setFormData({ ...formData, included: e.target.value })}
                            />
                            {stepErrors.included && <p className="text-red-400 text-sm mt-1">{stepErrors.included}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">What's NOT Included</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={3}
                                placeholder="Personal expenses, tips, souvenirs, etc."
                                value={formData.notIncluded}
                                onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Requirements / What to Bring</label>
                            <textarea
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                rows={3}
                                placeholder="Comfortable clothes, water bottle, sunscreen, camera, valid ID..."
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-white/90">Cancellation Policy</label>
                            <select
                                className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                value={formData.cancellationPolicy}
                                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
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
                    <div className="space-y-4">
                        <p className="text-sm text-white/60 mb-4">
                            Upload at least {REQUIRED_IMAGE_COUNT} photos (max {MAX_IMAGE_COUNT}). First photo will be your cover image.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={img.preview} alt="" className="w-full h-40 object-cover rounded-lg border border-white/10" />
                                    <button
                                        type="button"
                                        className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        onClick={() => removeImage(idx)}
                                    >
                                        <X size={16} />
                                    </button>
                                    {idx === 0 && (
                                        <div className="absolute bottom-2 left-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                                            Cover Photo
                                        </div>
                                    )}
                                </div>
                            ))}

                            {images.length < MAX_IMAGE_COUNT && (
                                <label className="h-40 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-[#ff6b35]/50 transition-all">
                                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] flex items-center justify-center mb-2">
                                        <Plus size={24} className="text-white" />
                                    </div>
                                    <span className="text-sm text-white/60">Add Photos</span>
                                </label>
                            )}
                        </div>
                        {stepErrors.images && <p className="text-red-400 text-sm mt-2">{stepErrors.images}</p>}
                        {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
                    </div>
                );

            case 6:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">Price per Person</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500 text-lg">$</span>
                                    <input
                                        className="w-full p-3 pl-8 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all text-lg"
                                        type="number"
                                        min="1"
                                        placeholder="75"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                {stepErrors.price && <p className="text-red-400 text-sm mt-1">{stepErrors.price}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-white/90">Group Discount (%)</label>
                                <input
                                    className="w-full p-3 border border-white/20 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all"
                                    type="number"
                                    min="0"
                                    max="50"
                                    placeholder="10"
                                    value={formData.groupDiscount}
                                    onChange={(e) => setFormData({ ...formData, groupDiscount: e.target.value })}
                                />
                                <p className="text-xs text-white/60 mt-1">For groups of 5+ people</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mt-8 p-6 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                            <h3 className="font-semibold text-lg mb-4 text-white flex items-center">
                                <Check className="w-5 h-5 mr-2 text-[#ff6b35]" />
                                Experience Summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/60">Type:</span>
                                    <span className="font-medium text-white">{formData.location || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/60">Duration:</span>
                                    <span className="font-medium text-white">{formData.duration || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/60">Skill Level:</span>
                                    <span className="font-medium text-white">{formData.skillLevel || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/60">Capacity:</span>
                                    <span className="font-medium text-white">
                                        {formData.minGuests || "1"}-{formData.maxGuests || "—"} guests
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/60">Photos:</span>
                                    <span className="font-medium text-white">{images.length} uploaded</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-[#ff6b35]/20 to-[#f7931e]/20 -mx-6 px-6 mt-4 rounded-lg border border-[#ff6b35]/30">
                                    <span className="text-white font-medium">Price per Person:</span>
                                    <span className="font-bold text-2xl bg-gradient-to-r from-[#ff6b35] to-[#f7931e] bg-clip-text text-transparent">
                                        ${formData.price || "0"}
                                    </span>
                                </div>
                                {formData.groupDiscount && (
                                    <div className="text-center text-sm text-[#f7931e] pt-2">
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
        <div className="min-h-screen bg-[#1a1a2e] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] bg-clip-text text-transparent">
                        Create an Experience
                    </h1>
                    <p className="text-white/60">Share unforgettable moments with travelers from around the world</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {STEPS.map((step, idx) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep > step.id
                                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50"
                                            : currentStep === step.id
                                                ? "bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white ring-4 ring-[#ff6b35]/30 shadow-lg shadow-[#ff6b35]/50"
                                                : "bg-white/10 text-white/40 border border-white/20"
                                            }`}
                                    >
                                        {currentStep > step.id ? <Check size={20} /> : step.id}
                                    </div>
                                    <span className="text-xs mt-2 text-center hidden md:block max-w-[80px] text-white/70">
                                        {step.title}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 transition-all rounded-full ${currentStep > step.id
                                            ? "bg-gradient-to-r from-green-500 to-green-600"
                                            : "bg-white/10"
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {STEPS[currentStep - 1].title}
                        </h2>
                        <p className="text-white/60">{STEPS[currentStep - 1].description}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="min-h-[450px]">
                            {renderStep()}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                            <button
                                type="button"
                                onClick={currentStep === 1 ? onClose : prevStep}
                                disabled={currentStep === 1 && !onClose}
                                className="flex items-center gap-2 px-6 py-3 border border-white/20 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft size={20} />
                                {currentStep === 1 ? "Cancel" : "Back"}
                            </button>

                            {currentStep < STEPS.length ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg hover:shadow-lg hover:shadow-[#ff6b35]/50 transition-all font-medium"
                                >
                                    Next
                                    <ArrowRight size={20} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? "Creating..." : "Create Experience"}
                                    <Check size={20} 
                                    />
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer Tip */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-white/50">
                        Step {currentStep} of {STEPS.length} • All fields can be edited later
                    </p>
                </div>
            </div>
        </div>
    );



// =================================================================
// HOW TO USE THIS COMPONENT
// =================================================================
// 
// 1. Save this file as AddExperience.jsx in your components folder
// 
// 2. Update your Cloudinary credentials at the top:
//    const CLOUD_NAME = "your_cloud_name";
//    const UPLOAD_PRESET = "your_upload_preset";
// 
// 3. Import and use in your app:
//    import AddExperience from './components/AddExperience';
// 
//    <AddExperience 
//      onExperienceCreated={(data) => console.log('Created:', data)}
//      onClose={() => navigate('/HostPage')}
//    />
// 
// 4. Make sure you have these dependencies installed:
//    npm install lucide-react firebase react-router-dom
// 
// 5. The component will save to Firestore collection: "experiences"
// 
// =================================================================-medium text-white capitalize">
<div className="space-y-3 text-sm">
    <div className="flex justify-between items-center py-2 border-b border-white/10">
        <span className="text-white/60">Type:</span>
        <span className="font-medium text-white capitalize">
            {EXPERIENCE_TYPES.find(t => t.id === formData.type)?.name || "—"}
        </span>
    </div>

    <div className="flex justify-between items-center py-2 border-b border-white/10">
        <span className="text-white/60">Title:</span>
        <span className="font-medium text-white truncate ml-4 max-w-[200px]">
            {formData.title || "—"}
        </span>
    </div>

    <div className="flex justify-between items-center py-2 border-b border-white/10">
        <span className="text-white/60">Location:</span>
        <span className="font-medium text-white">
            {formData.location || "—"}
        </span>
    </div>
</div>
}