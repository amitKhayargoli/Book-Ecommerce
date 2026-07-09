"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet default icon fix — using CDN URLs since Turbopack doesn't resolve PNG imports reliably
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── Types ────────────────────────────────────────────────────────

export interface AddressComponents {
  street: string;
  city?: string;
  state?: string;
  country?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

interface ReverseGeoResponse {
  status?: number;
  message?: string;
  data?: Array<{
    name?: string;
    address?: string;
    centroid?: { lat: number; lon: number };
  }>;
}

export interface MapPickerProps {
  onAddressFound: (components: AddressComponents) => void;
  onCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  onReverseGeocodingChange: (loading: boolean) => void;
  onGeoError: (error: string | null) => void;
}

export default function MapPicker({
  onAddressFound,
  onCoordsChange,
  onReverseGeocodingChange,
  onGeoError,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reverse geocode (Baato + Nominatim fallback for state) ──

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      onReverseGeocodingChange(true);

      let street = "";
      let city: string | undefined;
      let state: string | undefined;

      // 1. Primary: Baato reverse geocode for street address
      try {
        const res = await fetch(`/api/addresses/reverse-geocode?lat=${lat}&lon=${lng}`);
        const json = (await res.json()) as ReverseGeoResponse;
        if (json.data && json.data.length > 0) {
          const result = json.data[0];
          const addressStr = result.address || result.name || "";
          const parts = addressStr.split(",").map((s) => s.trim()).filter(Boolean);
          const last = parts[parts.length - 1] || "";
          const parsedCity = last.split("-")[0]?.trim() || last;
          street = addressStr;
          city = parsedCity !== parts[0] ? parsedCity : undefined;
        }
      } catch {
        // Baato failed, will try Nominatim below
      }

      // 2. Fallback: Nominatim for state/province (and street if Baato failed)
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "User-Agent": "BookstoreApp/1.0" } },
        );
        const nomData = (await nomRes.json()) as {
          display_name?: string;
          address?: { state?: string; city?: string; town?: string; village?: string; county?: string; road?: string };
        };
        if (nomData) {
          state = nomData.address?.state;
          if (!street) {
            street = nomData.display_name || "";
          }
          if (!city) {
            city = nomData.address?.city || nomData.address?.town || nomData.address?.village || nomData.address?.county;
          }
        }
      } catch {
        // Nominatim failed, use whatever we got from Baato
      }

      onReverseGeocodingChange(false);

      if (!street) {
        onGeoError("No address found for this location");
        return;
      }

      onAddressFound({ street, city, state });
    },
    [onAddressFound, onGeoError, onReverseGeocodingChange],
  );

  // ── Map click handler ──

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      onCoordsChange({ lat, lng });

      const map = mapRef.current;
      if (!map) return;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      onGeoError(null);
      await reverseGeocode(lat, lng);
    },
    [onCoordsChange, onGeoError, reverseGeocode],
  );

  // ── Place search (Nominatim) ──

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=NP`,
          { headers: { "User-Agent": "BookstoreApp/1.0" } },
        );
        const data = (await res.json()) as NominatimResult[];
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch {
        // search failed silently
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectSearchResult = useCallback(
    (result: NominatimResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      setShowResults(false);
      setSearchQuery(result.display_name.split(",")[0]?.trim() || result.display_name);

      const map = mapRef.current;
      if (map) {
        map.flyTo([lat, lng], 15);
        void handleMapClick(lat, lng);
      }
    },
    [handleMapClick],
  );

  // ── Current location ──

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      onGeoError("Geolocation is not supported in your browser");
      return;
    }
    onGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo([lat, lng], 15);
          void handleMapClick(lat, lng);
        }
      },
      () => {
        onGeoError("Could not get your location. Please click on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [handleMapClick, onGeoError]);

  // ── Init map ──

  useEffect(() => {
    if (containerRef.current && !mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [27.7172, 85.324],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        void handleMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      setReady(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [handleMapClick]);

  return (
    <div className="space-y-3">
      {/* Search bar — above the map, normal document flow */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search for a place (e.g. Kathmandu, Pokhara)..."
          className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50">
            <div className="bg-black/90 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-xl">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSelectSearchResult(result)}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className="line-clamp-1">{result.display_name}</span>
                  <span className="text-[0.65rem] text-white/30 mt-0.5 block">
                    {result.type || "place"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
        <div ref={containerRef} className="w-full h-[320px] md:h-[400px]" />

        {!ready && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mb-3" />
            <p className="text-sm text-text-secondary">Loading map...</p>
          </div>
        )}

        <button
          onClick={handleUseCurrentLocation}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl bg-black/70 border border-white/10 flex items-center justify-center hover:bg-black/90 transition-all"
          title="Use my current location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
