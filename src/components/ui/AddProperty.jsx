
import React, { useState } from "react";
import { Plus } from "lucide-react";

// If you have a callback for property creation, pass it as a prop
// export default function AddProperty({ onPropertyCreated }) {

export default function AddProperty({ onPropertyCreated }) {

    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: '',
        category: '',
        price: '',
        location: '',
        maxGuests: '',
        bedrooms: '',
        bathrooms: '',
        amenities: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle property creation
        console.log('Creating property:', formData);
        setOpen(false);
        if (onPropertyCreated) onPropertyCreated();
    };

    return (
        <div open={open} onOpenChange={setOpen}>
            <div asChild>
                <button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Listing
                </button>
            </div>
            <div className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <header>
                    <h3>Create New Property Listing</h3>
                </header>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="title">Property Title</label>
                        <input
                            id="title"
                            placeholder="e.g., Luxury Beachfront Villa"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            placeholder="Describe your property..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="type">Property Type</label>
                            <select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                <selectrigger>
                                    <selectvalue />
                                </selectrigger>
                                <selectcontent>
                                    <selectitem value="home">Home</selectitem>
                                    <selectitem value="experience">Experience</selectitem>
                                    <selectitem value="service">Service</selectitem>
                                </selectcontent>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="category">Category</label>
                            <input
                                id="category"
                                placeholder="e.g., Villa, Cabin, Tour"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="price">Price per Night ($)</label>
                            <input
                                id="price"
                                type="number"
                                placeholder="150"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="location">Location</label>
                            <input
                                id="location"
                                placeholder="City, State/Country"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="maxGuests">Max Guests</label>
                            <input
                                id="maxGuests"
                                type="number"
                                placeholder="4"
                                value={formData.maxGuests}
                                onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="bedrooms">Bedrooms</label>
                            <input
                                id="bedrooms"
                                type="number"
                                placeholder="2"
                                value={formData.bedrooms}
                                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="bathrooms">Bathrooms</label>
                            <input
                                id="bathrooms"
                                type="number"
                                placeholder="1"
                                value={formData.bathrooms}
                                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="amenities">Amenities (comma-separated)</label>
                        <input
                            id="amenities"
                            placeholder="WiFi, Pool, Kitchen, Parking"
                            value={formData.amenities}
                            onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="submit" className="flex-1">Create Listing</button>
                        <button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}