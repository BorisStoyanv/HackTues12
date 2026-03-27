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
  if (!MAPBOX_API_KEY) {
    throw new Error("Mapbox token is missing.");
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_API_KEY}&types=locality,place,address,poi,neighborhood&limit=1`,
    );
  } catch (error) {
    throw new Error(
      "Unable to reach the location service. Check your connection and try again.",
    );
  }

  let data: { features?: MapboxFeature[]; message?: string };
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Location service returned an invalid response.");
  }

  const feature = (data.features?.[0] ?? null) as MapboxFeature | null;

  if (!response.ok) {
    throw new Error(data.message || "Location lookup failed. Please try again.");
  }

  if (!feature) {
    throw new Error("No matching location found.");
  }

  const { city, country } = parseContext(feature);
  const [lng, lat] = feature.center;

  return {
    city,
    country,
    formatted_address: feature.place_name,
    lat,
    lng,
  };
}
