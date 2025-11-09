import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Default center: Manila, Philippines
const DEFAULT_CENTER = [14.5995, 120.9842];
const DEFAULT_ZOOM = 13;

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({ onLocationSelect, initialLocation = null }) {
  const [position, setPosition] = useState(initialLocation ? [initialLocation.lat, initialLocation.lng] : DEFAULT_CENTER);
  const [address, setAddress] = useState(initialLocation?.address || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reverse geocoding function using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Explora-Property-App/1.0"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      const resolvedAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(resolvedAddress);
      return resolvedAddress;
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      setError("Failed to fetch address. Using coordinates.");
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      return fallbackAddress;
    } finally {
      setLoading(false);
    }
  };

  // Handle map click
  const handleMapClick = async (latlng) => {
    const newPosition = [latlng.lat, latlng.lng];
    setPosition(newPosition);
    
    const resolvedAddress = await reverseGeocode(latlng.lat, latlng.lng);
    
    // Notify parent component
    if (onLocationSelect) {
      onLocationSelect({
        lat: latlng.lat,
        lng: latlng.lng,
        address: resolvedAddress,
      });
    }
  };

  // Load initial address if position is set
  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      setPosition([initialLocation.lat, initialLocation.lng]);
      if (initialLocation.address) {
        setAddress(initialLocation.address);
      } else {
        reverseGeocode(initialLocation.lat, initialLocation.lng);
      }
    }
  }, [initialLocation]);

  return (
    <div style={{ width: "100%", marginBottom: "20px" }}>
      <label style={{ 
        display: "block", 
        marginBottom: "8px", 
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: "14px"
      }}>
        Location <span style={{ color: "#ff4444" }}>*</span>
      </label>
      
      <div style={{
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        marginBottom: "12px"
      }}>
        <MapContainer
          center={position}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>

      {/* Selected Location Info */}
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        marginBottom: "12px"
      }}>
        {loading ? (
          <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px" }}>
            Loading address...
          </div>
        ) : (
          <>
            <div style={{ 
              marginBottom: "8px",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: "500",
              fontSize: "14px"
            }}>
              Selected Address:
            </div>
            <div style={{ 
              color: "#ffffff",
              fontSize: "14px",
              marginBottom: "8px",
              wordBreak: "break-word"
            }}>
              {address || "Click on the map to select a location"}
            </div>
            <div style={{ 
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "12px",
              fontFamily: "monospace"
            }}>
              Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          </>
        )}
        {error && (
          <div style={{ 
            color: "#ef4444",
            fontSize: "12px",
            marginTop: "8px"
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        color: "rgba(255, 255, 255, 0.6)",
        fontSize: "12px",
        fontStyle: "italic"
      }}>
        💡 Click on the map to set your property location
      </div>
    </div>
  );
}

