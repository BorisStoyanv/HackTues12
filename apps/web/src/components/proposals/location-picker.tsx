"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapMouseEvent, MapRef, ViewState } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAPBOX_API_KEY } from "@/lib/env";
import "mapbox-gl/dist/mapbox-gl.css";
import { EU_COUNTRIES } from "@/lib/kyc-utils";
import { motion } from "framer-motion";

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
  euOnly?: boolean;
}

interface GeocodeResult {
  city: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

export function LocationPicker({ value, onChange, error, euOnly = true }: LocationPickerProps) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  
  const [searchQuery, setSearchQuery] = useState(value.formatted_address || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);

  // Initialize viewState focused on Europe if empty
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: value.lng || 15.2551,
    latitude: value.lat || 54.5260,
    zoom: value.lat && value.lng ? 12 : 3.5,
  });

  const mapStyle = resolvedTheme === "dark" 
    ? "mapbox://styles/mapbox/dark-v11" 
    : "mapbox://styles/mapbox/light-v11";

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInEU = (country: string) => {
    if (!euOnly) return true;
    return EU_COUNTRIES.some(c => 
      c.name.toLowerCase() === country.toLowerCase() || 
      country.toLowerCase().includes(c.name.toLowerCase())
    );
  };

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
        let results = data.results || [];
        
        if (euOnly) {
          results = results.filter((r: GeocodeResult) => isInEU(r.country));
        }
        
        setSearchResults(results);
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
    setRestrictionError(null);
    
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
      setRestrictionError(null);
      setViewState((prev) => ({ ...prev, longitude: lng, latitude: lat }));
      
      try {
        // We use the geocoding API to check the country of the click
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: `${lat},${lng}` }),
        });
        const data = await res.json();
        const result = data.results?.[0];

        if (result) {
          if (euOnly && !isInEU(result.country)) {
            setRestrictionError("The OpenFairTrip protocol is currently restricted to European jurisdictions.");
            setIsResolvingPin(false);
            return;
          }

          setSearchQuery(result.formattedAddress);
          onChange({
            formatted_address: result.formattedAddress,
            city: result.city || "Pinned location",
            country: result.country,
            lat,
            lng,
          });
        } else {
          const placeholderAddress = `Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setSearchQuery(placeholderAddress);
          onChange({
            formatted_address: placeholderAddress,
            city: value.city || "Pinned location",
            country: value.country || "Unknown Country",
            lat,
            lng,
          });
        }
      } catch (err) {
        console.error("Resolution error:", err);
      } finally {
        setIsResolvingPin(false);
      }
    },
    [onChange, value.city, value.country, euOnly],
  );

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

  // Sync prop value to internal view state
  useEffect(() => {
    if (value.lat && value.lng) {
      const latDiff = Math.abs(value.lat - (viewState.latitude || 0));
      const lngDiff = Math.abs(value.lng - (viewState.longitude || 0));
      
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        setViewState((prev) => ({ ...prev, longitude: value.lng, latitude: value.lat, zoom: 14 }));
      }

      if (value.formatted_address && value.formatted_address !== searchQuery) {
        setSearchQuery(value.formatted_address);
      }
    }
  }, [value.lat, value.lng, value.formatted_address]);

  return (
    <div className="space-y-6">
      <div className="relative z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder={euOnly ? "Search for a European city or address..." : "Search for an address..."}
            className={cn(
              "h-16 pl-12 pr-12 text-lg font-medium rounded-2xl border-border/40 bg-background/50 focus:ring-0 focus:border-foreground transition-all",
              (error || restrictionError) && "border-destructive focus:border-destructive"
            )}
            onFocus={() => {
               if (searchQuery.trim() && searchResults.length > 0) setShowResults(true);
            }}
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-3 bg-background border border-border/60 rounded-[1.5rem] shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto backdrop-blur-xl"
          >
            {searchResults.map((result, idx) => (
              <button
                key={`${result.formattedAddress}-${idx}`}
                type="button"
                className="w-full text-left px-6 py-4 text-sm font-bold hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors border-b border-border/20 last:border-0"
                onClick={() => handleSelectResult(result)}
              >
                {result.formattedAddress}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className={cn(
        "h-[400px] w-full rounded-[2.5rem] border-2 overflow-hidden relative bg-muted shadow-inner transition-all duration-500",
        (error || restrictionError) ? "border-destructive/40" : "border-border/20"
      )}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_API_KEY}
          onError={(e) => {
            console.warn("Mapbox warning/error suppressed:", e.error?.message || "Unknown Mapbox error");
          }}
        >
          <div className="absolute top-4 right-4 z-10">
            <NavigationControl showCompass={false} />
          </div>
          
          {value.lat && value.lng && !restrictionError ? (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              anchor="bottom"
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <div className="relative group cursor-grab active:cursor-grabbing">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all animate-pulse" />
                <MapPin className="h-10 w-10 text-primary relative z-10 filter drop-shadow-lg" fill="currentColor" />
              </div>
            </Marker>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-background/10 backdrop-blur-[2px]">
                <div className="bg-background/90 px-6 py-3 rounded-full shadow-2xl border border-border/40 animate-in zoom-in-95 duration-500">
                   <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
                      {restrictionError || "Drop Anchor in Europe"}
                   </p>
                </div>
             </div>
          )}
        </Map>
      </div>

      {restrictionError && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 flex gap-3 text-destructive"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-bold leading-tight">{restrictionError}</p>
        </motion.div>
      )}
      
      {/* Read-only view of parsed data */}
      {value.lat !== 0 && value.lng !== 0 && !restrictionError && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
             <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Resolved City</span>
             <div className="font-bold text-sm truncate px-1">
               {value.city || "Regional Hub"}
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
             <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Jurisdiction</span>
             <div className="font-bold text-sm truncate px-1">
               {value.country || "EU Domain"}
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
