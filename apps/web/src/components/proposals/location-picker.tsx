"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapMouseEvent, MapRef, ViewState } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAPBOX_API_KEY } from "@/lib/env";
import "mapbox-gl/dist/mapbox-gl.css";

interface LocationData {
  formatted_address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  error?: string;
}

interface GeocodeResult {
  city: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

export function LocationPicker({ value, onChange, error }: LocationPickerProps) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  
  const [searchQuery, setSearchQuery] = useState(value.formatted_address || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Initialize viewState based on value or default to a global view
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: value.lng || 0,
    latitude: value.lat || 20,
    zoom: value.lat && value.lng ? 12 : 2,
  });

  const mapStyle = resolvedTheme === "dark" 
    ? "mapbox://styles/mapbox/dark-v11" 
    : "mapbox://styles/mapbox/light-v11";

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle Search Input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setShowResults(true);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: query }),
        });
        
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = (result: GeocodeResult) => {
    const { lat, lng, city, country, formattedAddress } = result;

    setSearchQuery(formattedAddress);
    setShowResults(false);
    
    // Update map view
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: 14,
    });
    
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
    }

    onChange({
      formatted_address: formattedAddress,
      city,
      country,
      lat,
      lng,
    });
  };

  const resolveAndSetLocation = useCallback(
    async (lng: number, lat: number) => {
      setIsResolvingPin(true);
      setViewState((prev) => ({ ...prev, longitude: lng, latitude: lat }));
      
      // Since reverse geocoding is currently unavailable via our internal API,
      // we update the coordinates and set a placeholder address.
      const placeholderAddress = `Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSearchQuery(placeholderAddress);
      
      onChange({
        formatted_address: placeholderAddress,
        city: value.city || "Pinned location",
        country: value.country || "Unknown Country",
        lat,
        lng,
      });
      
      setIsResolvingPin(false);
    },
    [onChange, value.city, value.country],
  );

  // Reverse geocode when dragging the marker
  const handleMarkerDragEnd = async (e: { lngLat: { lng: number; lat: number } }) => {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
    await resolveAndSetLocation(lng, lat);
  };

  const handleMapClick = useCallback(async (event: MapMouseEvent) => {
    const lng = event.lngLat.lng;
    const lat = event.lngLat.lat;
    setViewState((prev) => ({ ...prev, longitude: lng, latitude: lat }));
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: Math.max(Number(viewState.zoom || 12), 12) });
    }
    await resolveAndSetLocation(lng, lat);
  }, [resolveAndSetLocation, viewState.zoom]);

  // Sync prop value to internal view state (e.g. initial load or programmatic changes)
  useEffect(() => {
    if (value.lat && value.lng) {
      const latDiff = Math.abs(value.lat - (viewState.latitude || 0));
      const lngDiff = Math.abs(value.lng - (viewState.longitude || 0));
      
      // Only sync if there is a significant difference to avoid loops
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        setViewState((prev) => ({ ...prev, longitude: value.lng, latitude: value.lat, zoom: 14 }));
      }

      if (value.formatted_address && value.formatted_address !== searchQuery) {
        setSearchQuery(value.formatted_address);
      }
    }
  }, [value.lat, value.lng, value.formatted_address]);

  return (
    <div className="space-y-4">
      <div className="relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search for an address, city, or location..."
            className={cn("pl-9 bg-background", error && "border-destructive")}
            onFocus={() => {
               if (searchQuery.trim() && searchResults.length > 0) setShowResults(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicking results
              setTimeout(() => setShowResults(false), 200);
            }}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={`${result.formattedAddress}-${idx}`}
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors"
                onClick={() => handleSelectResult(result)}
              >
                {result.formattedAddress}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn("h-[300px] w-full rounded-md border overflow-hidden relative bg-muted", error && "border-destructive")}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_API_KEY}
          onError={(e) => {
            // Suppress Mapbox GL JS errors from flooding the console if the token is invalid or tiles fail to load
            console.warn("Mapbox warning/error suppressed:", e.error?.message || "Unknown Mapbox error");
          }}
        >
          <NavigationControl position="bottom-right" />
          
          {value.lat && value.lng ? (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              anchor="bottom"
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <MapPin className="h-8 w-8 text-primary -mt-8 -ml-4" fill="currentColor" />
            </Marker>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-background/50 backdrop-blur-[1px]">
                <p className="text-sm font-medium bg-background px-4 py-2 rounded-full shadow-sm border">
                   Search or click anywhere on the map to place a pin
                </p>
             </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border bg-background/90 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
            {isResolvingPin
              ? "Resolving pinned location..."
              : "Click map to drop a pin, or drag the marker to refine it"}
          </div>
        </Map>
      </div>
      
      {/* Read-only view of parsed data */}
      {value.lat !== 0 && value.lng !== 0 && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
             <span className="text-muted-foreground block mb-1">City</span>
             <div className="font-medium bg-muted/50 p-2 rounded border border-border/50 truncate">
               {value.city || "-"}
             </div>
          </div>
          <div>
             <span className="text-muted-foreground block mb-1">Country</span>
             <div className="font-medium bg-muted/50 p-2 rounded border border-border/50 truncate">
               {value.country || "-"}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
