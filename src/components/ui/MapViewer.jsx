import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Default center: Manila, Philippines (fallback)
const DEFAULT_CENTER = [14.5995, 120.9842];
const DEFAULT_ZOOM = 13;

export default function MapViewer({ location, propertyTitle = "Property Location" }) {
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  useEffect(() => {
    if (location?.lat && location?.lng) {
      setMapCenter([location.lat, location.lng]);
      setMapZoom(15); // Zoom in closer for property view
    }
  }, [location]);

  // If no location data, show message
  if (!location || !location.lat || !location.lng) {
    return (
      <div style={{
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255, 255, 255, 0.6)",
        fontSize: "14px"
      }}>
        Location information not available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", marginBottom: "20px" }}>
      <h3 style={{
        marginBottom: "12px",
        fontSize: "18px",
        fontWeight: "600",
        color: "#ffffff"
      }}>
        📍 Location
      </h3>
      
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
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[location.lat, location.lng]}>
            <Popup>
              <div style={{ textAlign: "center" }}>
                <strong>{propertyTitle}</strong>
                <br />
                {location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Address Display */}
      {location.address && (
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: "500",
            fontSize: "14px",
            marginBottom: "8px"
          }}>
            Address:
          </div>
          <div style={{
            color: "#ffffff",
            fontSize: "14px",
            wordBreak: "break-word"
          }}>
            {location.address}
          </div>
        </div>
      )}
    </div>
  );
}

