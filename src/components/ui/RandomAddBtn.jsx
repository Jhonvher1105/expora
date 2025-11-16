import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { auth, db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Pexels API Configuration
// Get your free API key from https://www.pexels.com/api/
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || "YOUR_PEXELS_API_KEY_HERE";
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

// Philippines Locations with coordinates and location-specific image keywords
const PHILIPPINES_LOCATIONS = [
    { name: "Manila", lat: 14.5995, lng: 120.9842, address: "Manila, Metro Manila, Philippines", imageKeywords: "urban city metropolitan" },
    { name: "Cebu City", lat: 10.3157, lng: 123.8854, address: "Cebu City, Cebu, Philippines", imageKeywords: "tropical city beach island" },
    { name: "Boracay", lat: 11.9674, lng: 121.9248, address: "Boracay Island, Aklan, Philippines", imageKeywords: "beach white sand tropical island paradise" },
    { name: "Palawan", lat: 9.8349, lng: 118.7384, address: "Puerto Princesa, Palawan, Philippines", imageKeywords: "pristine tropical island nature jungle" },
    { name: "Baguio", lat: 16.4023, lng: 120.5960, address: "Baguio City, Benguet, Philippines", imageKeywords: "mountain cool weather pine trees scenic" },
    { name: "Tagaytay", lat: 14.1000, lng: 120.9333, address: "Tagaytay City, Cavite, Philippines", imageKeywords: "mountain view volcano cool weather scenic" },
    { name: "Davao", lat: 7.1907, lng: 125.4553, address: "Davao City, Davao del Sur, Philippines", imageKeywords: "tropical city mountain nature" },
    { name: "Bohol", lat: 9.8499, lng: 124.1435, address: "Tagbilaran City, Bohol, Philippines", imageKeywords: "chocolate hills beach island tropical" },
    { name: "Siargao", lat: 9.8563, lng: 126.0645, address: "Siargao Island, Surigao del Norte, Philippines", imageKeywords: "surfing beach tropical island waves" },
    { name: "Batanes", lat: 20.4485, lng: 121.9702, address: "Basco, Batanes, Philippines", imageKeywords: "rolling hills scenic windy dramatic landscape" },
    { name: "Vigan", lat: 17.5748, lng: 120.3869, address: "Vigan City, Ilocos Sur, Philippines", imageKeywords: "heritage colonial historical cobblestone" },
    { name: "Sagada", lat: 17.0833, lng: 120.9000, address: "Sagada, Mountain Province, Philippines", imageKeywords: "mountain caves adventure cultural" },
    { name: "El Nido", lat: 11.1953, lng: 119.4056, address: "El Nido, Palawan, Philippines", imageKeywords: "limestone cliffs pristine beach island hopping tropical" },
    { name: "Coron", lat: 12.0044, lng: 120.2042, address: "Coron, Palawan, Philippines", imageKeywords: "island diving crystal clear water tropical pristine" },
];

// Property Data Templates
const PROPERTY_TYPES = ["home", "apartment", "hotel", "resort"];
const DAY_NIGHT_OPTIONS = ["day", "night"];
const PROPERTY_TITLES = [
    "Cozy Beachfront Villa", "Modern City Apartment", "Mountain View Resort", "Luxury Hotel Suite",
    "Tropical Paradise Home", "Urban Loft Apartment", "Seaside Resort Villa", "Downtown Hotel",
    "Garden View Home", "Skyline Apartment", "Beach Resort", "Boutique Hotel",
    "Family-Friendly Villa", "Studio Apartment", "Luxury Resort", "Business Hotel"
];
const PROPERTY_DESCRIPTIONS = [
    "Experience the perfect blend of comfort and luxury in this stunning property. Located in a prime area with easy access to local attractions, restaurants, and beaches.",
    "A beautifully designed space that offers modern amenities and breathtaking views. Perfect for families, couples, or solo travelers seeking a memorable stay.",
    "This exceptional property features spacious rooms, fully equipped kitchen, and access to world-class facilities. Ideal for both short and long-term stays.",
    "Nestled in a peaceful neighborhood, this property provides a tranquil escape while being close to all the action. Enjoy the best of both worlds.",
    "Step into elegance and sophistication. This property boasts premium furnishings, state-of-the-art amenities, and personalized service for an unforgettable experience."
];
const AMENITIES_POOL = ["WiFi", "Air Conditioning", "Pool", "Parking", "Kitchen", "TV", "Washing Machine", "Hot Tub"];
const AMENITIES_BASIC = ["WiFi", "Air Conditioning", "Parking", "Kitchen", "TV", "Washing Machine"];

// Service Data Templates
const SERVICE_TYPES = ["Tour", "Activity", "Transportation", "Food & Dining", "Wellness", "Entertainment"];
const SERVICE_TITLES = [
    "Island Hopping Adventure", "City Walking Tour", "Food Crawl Experience", "Spa & Wellness Package",
    "Sunset Cruise", "Cultural Heritage Tour", "Adventure Sports Package", "Photography Tour",
    "Cooking Class Experience", "Nature Trekking", "Water Sports Package", "Historical Tour",
    "Beach Activities", "Mountain Climbing", "Diving Experience", "Wildlife Watching"
];
const SERVICE_DESCRIPTIONS = [
    "Join us for an unforgettable journey through the most beautiful destinations. Our experienced guides will ensure you have a safe and memorable experience.",
    "Discover hidden gems and local secrets with our expertly curated tours. Perfect for travelers who want to experience authentic local culture.",
    "Enjoy a hassle-free experience with all equipment and guidance provided. Suitable for all skill levels, from beginners to advanced participants.",
    "Immerse yourself in local traditions and create lasting memories. Our services are designed to provide the best value and unforgettable moments."
];
const DURATION_OPTIONS = [
    "30 minutes", "1 hour", "2 hours", "3 hours", "4 hours",
    "Half day (4-6 hours)", "Full day (8+ hours)", "Multiple days"
];

// Experience Data Templates
const EXPERIENCE_TYPES = ["adventure", "cultural", "food-drink", "wellness", "nature", "entertainment", "sports", "workshop"];
const EXPERIENCE_TITLES = [
    "Sunset Kayaking Adventure", "Traditional Cooking Workshop", "Jungle Trekking Experience",
    "Cultural Village Tour", "Beach Yoga Session", "Local Market Food Tour",
    "Waterfall Hiking", "Pottery Making Class", "Island Snorkeling", "Heritage Walk",
    "Mountain Biking", "Surfing Lessons", "Cave Exploration", "Bird Watching Tour", "Sunrise Photography"
];
const EXPERIENCE_TAGLINES = [
    "Paddle through pristine waters at golden hour", "Learn authentic local recipes from expert chefs",
    "Explore untouched natural wonders", "Immerse yourself in rich cultural traditions",
    "Find peace and tranquility by the ocean", "Taste the best local flavors and dishes",
    "Discover hidden natural gems", "Create beautiful art with your hands",
    "Swim with colorful marine life", "Walk through centuries of history",
    "Ride through scenic mountain trails", "Catch your first wave with expert guidance"
];
const EXPERIENCE_DESCRIPTIONS = [
    "An immersive experience that combines adventure, culture, and natural beauty. Perfect for those seeking authentic and memorable moments.",
    "Join us for a hands-on experience where you'll learn new skills, meet locals, and create lasting memories in one of the Philippines' most beautiful destinations.",
    "This carefully curated experience offers the perfect balance of excitement and relaxation, designed to leave you with unforgettable stories to tell.",
    "Discover the hidden gems and local secrets that make this destination special. Our expert guides ensure a safe, educational, and fun experience for all participants."
];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];
const HIGHLIGHTS_TEMPLATES = [
    "Expert local guide\nSmall group experience\nAll equipment included\nSafety briefing provided",
    "Authentic local experience\nPhoto opportunities\nRefreshments included\nFlexible scheduling",
    "Beautiful scenic locations\nProfessional instruction\nCertificate of completion\nMemorable keepsakes"
];

// Fetch images from Pexels
const fetchImagesFromPexels = async (query, count = 5) => {
    try {
        if (!PEXELS_API_KEY || PEXELS_API_KEY === "YOUR_PEXELS_API_KEY_HERE") {
            console.warn("Pexels API key not configured. Using placeholder images.");
            // Return placeholder images if API key is not set
            return Array.from({ length: count }, (_, i) => 
                `https://picsum.photos/800/600?random=${Date.now()}-${i}`
            );
        }

        const response = await fetch(`${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${count}&page=1`, {
            headers: {
                "Authorization": PEXELS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            return data.photos.map(photo => photo.src.large || photo.src.medium);
        } else {
            // Fallback to placeholder if no results
            return Array.from({ length: count }, (_, i) => 
                `https://picsum.photos/800/600?random=${Date.now()}-${i}`
            );
        }
    } catch (error) {
        console.error("Error fetching images from Pexels:", error);
        // Fallback to placeholder images
        return Array.from({ length: count }, (_, i) => 
            `https://picsum.photos/800/600?random=${Date.now()}-${i}`
        );
    }
};

// Generate random property
const generateProperty = async (index, location) => {
    const type = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
    const dayNight = DAY_NIGHT_OPTIONS[Math.floor(Math.random() * DAY_NIGHT_OPTIONS.length)];
    const title = PROPERTY_TITLES[Math.floor(Math.random() * PROPERTY_TITLES.length)];
    const description = PROPERTY_DESCRIPTIONS[Math.floor(Math.random() * PROPERTY_DESCRIPTIONS.length)];
    
    // Build more relevant image query with location-specific keywords
    const locationKeywords = location.imageKeywords || location.name.toLowerCase();
    const imageQuery = `${type} ${locationKeywords} ${location.name} philippines`;
    const images = await fetchImagesFromPexels(imageQuery, Math.floor(Math.random() * 6) + 5); // 5-10 images
    
    return {
        title: `${title} in ${location.name}`,
        description: `${description} Located in the heart of ${location.name}, this property offers easy access to local attractions, dining, and entertainment.`,
        type: type,
        category: "home",
        day_night: dayNight,
        price: Math.floor(Math.random() * 13500) + 1500, // ₱1,500 - ₱15,000
        maxGuests: Math.floor(Math.random() * 11) + 2, // 2-12
        bedrooms: Math.floor(Math.random() * 5) + 1, // 1-5
        bathrooms: Math.floor(Math.random() * 4) + 1, // 1-4
        amenities: type === "resort" || type === "hotel" 
            ? AMENITIES_POOL.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 4)
            : AMENITIES_BASIC.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3),
        location: {
            lat: location.lat + (Math.random() * 0.1 - 0.05), // Add slight variation
            lng: location.lng + (Math.random() * 0.1 - 0.05),
            address: `${location.address}`
        },
        images: images,
        discountPercentage: Math.random() > 0.7 ? Math.floor(Math.random() * 20) + 10 : null, // 30% chance of discount
        promoCode: Math.random() > 0.8 ? `PROMO${Math.floor(Math.random() * 1000)}` : null,
        isDraft: false,
        createdAt: new Date(),
    };
};

// Generate random service
const generateService = async (index, location) => {
    const type = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
    const title = SERVICE_TITLES[Math.floor(Math.random() * SERVICE_TITLES.length)];
    const description = SERVICE_DESCRIPTIONS[Math.floor(Math.random() * SERVICE_DESCRIPTIONS.length)];
    const duration = DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    
    // Build more relevant image query with location-specific keywords
    const locationKeywords = location.imageKeywords || location.name.toLowerCase();
    const imageQuery = `${type.toLowerCase()} ${locationKeywords} ${location.name} philippines`;
    const images = await fetchImagesFromPexels(imageQuery, Math.floor(Math.random() * 6) + 3); // 3-8 images
    
    return {
        category: "service",
        type: type,
        title: `${title} in ${location.name}`,
        description: `${description} Experience the best of ${location.name} with our professional ${type.toLowerCase()} service.`,
        location: {
            lat: location.lat + (Math.random() * 0.1 - 0.05),
            lng: location.lng + (Math.random() * 0.1 - 0.05),
            address: `${location.address}`
        },
        duration: duration,
        maxGuests: Math.floor(Math.random() * 19) + 2, // 2-20
        minGuests: 1,
        included: [
            "Professional guide",
            "All necessary equipment",
            "Safety briefing",
            "Refreshments"
        ],
        notIncluded: [
            "Transportation to meeting point",
            "Personal expenses",
            "Tips (optional)"
        ],
        requirements: [
            "Comfortable clothing",
            "Valid ID",
            "Water bottle"
        ],
        cancellationPolicy: "flexible",
        price: Math.floor(Math.random() * 4500) + 500, // ₱500 - ₱5,000
        priceType: "per_person",
        availability: "daily",
        startTime: `${Math.floor(Math.random() * 12) + 6}:00`, // 6 AM - 6 PM
        languages: ["English", "Filipino"],
        images: images,
        createdAt: Timestamp.now(),
    };
};

// Generate random experience
const generateExperience = async (index, location) => {
    const type = EXPERIENCE_TYPES[Math.floor(Math.random() * EXPERIENCE_TYPES.length)];
    const titleIndex = Math.floor(Math.random() * EXPERIENCE_TITLES.length);
    const title = EXPERIENCE_TITLES[titleIndex];
    const tagline = EXPERIENCE_TAGLINES[titleIndex] || EXPERIENCE_TAGLINES[0];
    const description = EXPERIENCE_DESCRIPTIONS[Math.floor(Math.random() * EXPERIENCE_DESCRIPTIONS.length)];
    const skillLevel = SKILL_LEVELS[Math.floor(Math.random() * SKILL_LEVELS.length)];
    const duration = DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    const highlights = HIGHLIGHTS_TEMPLATES[Math.floor(Math.random() * HIGHLIGHTS_TEMPLATES.length)].split('\n');
    
    // Build more relevant image query with location-specific keywords
    const locationKeywords = location.imageKeywords || location.name.toLowerCase();
    const imageQuery = `${type} ${locationKeywords} experience ${location.name} philippines`;
    const images = await fetchImagesFromPexels(imageQuery, Math.floor(Math.random() * 8) + 3); // 3-10 images
    
    return {
        category: "experience",
        type: type,
        title: `${title} in ${location.name}`,
        tagline: tagline,
        description: `${description} Located in beautiful ${location.name}, this experience offers an authentic and memorable adventure.`,
        location: {
            lat: location.lat + (Math.random() * 0.1 - 0.05),
            lng: location.lng + (Math.random() * 0.1 - 0.05),
            address: `${location.address}`
        },
        duration: duration,
        maxGuests: Math.floor(Math.random() * 14) + 2, // 2-15
        minGuests: 1,
        skillLevel: skillLevel,
        highlights: highlights,
        itinerary: [
            "Meet at designated location",
            "Introduction and safety briefing",
            "Main activity experience",
            "Break for refreshments",
            "Continue activity",
            "Closing and photo opportunities"
        ],
        included: [
            "Expert local guide",
            "All equipment provided",
            "Safety equipment",
            "Refreshments",
            "Photo documentation"
        ],
        notIncluded: [
            "Transportation to meeting point",
            "Personal expenses",
            "Tips (optional)"
        ],
        requirements: [
            "Comfortable clothing",
            "Water bottle",
            "Valid ID",
            "Camera (optional)"
        ],
        cancellationPolicy: "flexible",
        price: Math.floor(Math.random() * 7200) + 800, // ₱800 - ₱8,000
        groupDiscount: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 5 : null, // 50% chance
        languages: ["English", "Filipino"],
        hostInfo: "Experienced local guide with years of expertise in providing authentic and safe experiences.",
        images: images,
        createdAt: new Date(),
    };
};

export default function RandomAddBtn() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 30, type: "", message: "" });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (!user) {
                setError("Please log in to use this feature.");
            }
        });
        return unsubscribe;
    }, []);

    const generateAllListings = async () => {
        if (!currentUser) {
            setError("Please log in to generate listings.");
            return;
        }

        setIsGenerating(true);
        setError("");
        setSuccess(false);
        setProgress({ current: 0, total: 30, type: "", message: "Starting generation..." });

        try {
            const allListings = [];
            const randomLocations = [...PHILIPPINES_LOCATIONS].sort(() => 0.5 - Math.random());

            // Generate 10 Properties
            setProgress({ current: 0, total: 30, type: "Properties", message: "Generating properties..." });
            for (let i = 0; i < 10; i++) {
                const location = randomLocations[i % randomLocations.length];
                const property = await generateProperty(i, location);
                property.ownerId = currentUser.uid;
                allListings.push({ type: "property", data: property });
                setProgress({ current: i + 1, total: 30, type: "Properties", message: `Generated property ${i + 1}/10` });
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Generate 10 Services
            setProgress({ current: 10, total: 30, type: "Services", message: "Generating services..." });
            for (let i = 0; i < 10; i++) {
                const location = randomLocations[(i + 10) % randomLocations.length];
                const service = await generateService(i, location);
                service.ownerId = currentUser.uid;
                allListings.push({ type: "service", data: service });
                setProgress({ current: 10 + i + 1, total: 30, type: "Services", message: `Generated service ${i + 1}/10` });
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Generate 10 Experiences
            setProgress({ current: 20, total: 30, type: "Experiences", message: "Generating experiences..." });
            for (let i = 0; i < 10; i++) {
                const location = randomLocations[(i + 20) % randomLocations.length];
                const experience = await generateExperience(i, location);
                experience.ownerId = currentUser.uid;
                allListings.push({ type: "experience", data: experience });
                setProgress({ current: 20 + i + 1, total: 30, type: "Experiences", message: `Generated experience ${i + 1}/10` });
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Save all to Firestore
            setProgress({ current: 30, total: 30, type: "Saving", message: "Saving to database..." });
            
            const collections = {
                property: collection(db, "properties"),
                service: collection(db, "services"),
                experience: collection(db, "experiences")
            };

            for (const listing of allListings) {
                await addDoc(collections[listing.type], listing.data);
            }

            setSuccess(true);
            setProgress({ current: 30, total: 30, type: "Complete", message: "All listings created successfully!" });
            
            // Redirect after 3 seconds
            setTimeout(() => {
                navigate("/HostPage");
            }, 3000);

        } catch (err) {
            console.error("Error generating listings:", err);
            setError(err.message || "Failed to generate listings. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!currentUser) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                padding: "2rem"
            }}>
                <div style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "2rem",
                    borderRadius: "16px",
                    textAlign: "center",
                    backdropFilter: "blur(10px)"
                }}>
                    <AlertCircle size={48} style={{ marginBottom: "1rem" }} />
                    <h2>Please Log In</h2>
                    <p>You need to be logged in to generate random listings.</p>
                    <button
                        onClick={() => navigate("/LogIn")}
                        style={{
                            marginTop: "1rem",
                            padding: "0.75rem 2rem",
                            background: "var(--primary-gradient, linear-gradient(135deg, #ff6b35 0%, #f7931e 100%))",
                            border: "none",
                            borderRadius: "8px",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "600"
                        }}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            padding: "2rem"
        }}>
            <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "3rem",
                borderRadius: "20px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                maxWidth: "600px",
                width: "100%",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
            }}>
                {success ? (
                    <>
                        <CheckCircle size={64} style={{ marginBottom: "1rem", color: "#10b981" }} />
                        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Success!</h1>
                        <p style={{ fontSize: "1.125rem", marginBottom: "2rem", opacity: 0.9 }}>
                            30 listings (10 properties, 10 services, 10 experiences) have been created successfully!
                        </p>
                        <p style={{ opacity: 0.7 }}>Redirecting to Host Page...</p>
                    </>
                ) : (
                    <>
                        <Sparkles size={48} style={{ marginBottom: "1.5rem" }} />
                        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Random Listing Generator</h1>
                        <p style={{ fontSize: "1.125rem", marginBottom: "2rem", opacity: 0.9 }}>
                            Generate 10 properties, 10 services, and 10 experiences with random but realistic data.
                        </p>

                        {error && (
                            <div style={{
                                background: "rgba(239, 68, 68, 0.2)",
                                border: "1px solid rgba(239, 68, 68, 0.5)",
                                padding: "1rem",
                                borderRadius: "8px",
                                marginBottom: "1.5rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem"
                            }}>
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {isGenerating && (
                            <div style={{
                                background: "rgba(255, 255, 255, 0.1)",
                                padding: "1.5rem",
                                borderRadius: "12px",
                                marginBottom: "1.5rem"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                                    <span style={{ fontWeight: "600" }}>{progress.type}</span>
                                </div>
                                <div style={{
                                    background: "rgba(255, 255, 255, 0.2)",
                                    height: "8px",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                    marginBottom: "0.5rem"
                                }}>
                                    <div style={{
                                        background: "linear-gradient(90deg, #10b981, #34d399)",
                                        height: "100%",
                                        width: `${(progress.current / progress.total) * 100}%`,
                                        transition: "width 0.3s ease"
                                    }} />
                                </div>
                                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                                    {progress.current} / {progress.total} - {progress.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={generateAllListings}
                            disabled={isGenerating}
                            style={{
                                width: "100%",
                                padding: "1rem 2rem",
                                background: isGenerating 
                                    ? "rgba(255, 255, 255, 0.2)" 
                                    : "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
                                border: "none",
                                borderRadius: "12px",
                                color: "#fff",
                                cursor: isGenerating ? "not-allowed" : "pointer",
                                fontSize: "1.125rem",
                                fontWeight: "600",
                                transition: "all 0.3s ease",
                                opacity: isGenerating ? 0.6 : 1
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={20} style={{ display: "inline-block", marginRight: "0.5rem", animation: "spin 1s linear infinite" }} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} style={{ display: "inline-block", marginRight: "0.5rem" }} />
                                    Generate 30 Random Listings
                                </>
                            )}
                        </button>

                        <p style={{ 
                            marginTop: "1.5rem", 
                            fontSize: "0.875rem", 
                            opacity: 0.7,
                            lineHeight: "1.5"
                        }}>
                            Note: This will create real listings in your Firestore database. 
                            Make sure you have your Pexels API key configured in your .env file as VITE_PEXELS_API_KEY.
                        </p>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

