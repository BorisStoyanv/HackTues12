import { MAPBOX_API_KEY } from "./env";

interface MapboxFeature {
  place_name: string;
  text: string;
  place_type?: string[];
  center: [number, number];
  context?: {
    id: string;
    text: string;
  }[];
}

function parseContext(feature: MapboxFeature) {
  const featureType = feature.place_type?.[0] ?? "";
  const exactLabel = feature.text || "";
  let locality = "";
  let place = "";
  let country = "";

  for (const item of feature.context ?? []) {
    if (item.id.startsWith("locality")) {
      locality = item.text;
    }

    if (item.id.startsWith("place")) {
      place = item.text;
    }

    if (item.id.startsWith("country")) {
      country = item.text;
    }
  }

  const city =
    featureType === "locality" || featureType === "place"
      ? exactLabel
      : locality || place || exactLabel;

  return {
    city: city || "Unknown City",
    country: country || "Unknown Country",
  };
}

export async function geocodeAddress(address: string) {
  if (!address) {
    throw new Error("Address is required.");
  }

  let response: Response;
  try {
    response = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the location service. Check your connection and try again.",
    );
  }

  let data: {
    city?: string;
    country?: string;
    formattedAddress?: string;
    lat?: number;
    lng?: number;
    error?: string;
  };

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Location service returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Location lookup failed. Please try again.");
  }

  return {
    city: data.city || "Unknown City",
    country: data.country || "Unknown Country",
    formatted_address: data.formattedAddress || address,
    lat: data.lat ?? 0,
    lng: data.lng ?? 0,
  };
}
