import { NextResponse } from "next/server";

interface GoogleMapsAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleMapsResult {
  address_components: GoogleMapsAddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GCP_MAPS_API_KEY;
    if (!apiKey) {
      console.error("GCP_MAPS_API_KEY is not configured.");
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 500 }
      );
    }

    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const res = await fetch(geocodeUrl);
    const data: { status: string; results?: GoogleMapsResult[]; error_message?: string } = await res.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: data.error_message || "Could not resolve address. Please check and try again." },
        { status: 404 }
      );
    }

    const results = data.results.map((result: GoogleMapsResult) => {
      const addressComponents = result.address_components;
      const { lat, lng } = result.geometry.location;

      let city = "Unknown City";
      let country = "Unknown Country";

      for (const component of addressComponents) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        } else if (component.types.includes("administrative_area_level_1") && city === "Unknown City") {
           city = component.long_name;
        }
        if (component.types.includes("country")) {
          country = component.long_name;
        }
      }

      return {
        city,
        country,
        lat,
        lng,
        formattedAddress: result.formatted_address
      };
    });

    return NextResponse.json({
      results,
      // Keep backward compatibility for single-result callers
      ...results[0]
    });
  } catch (error) {
    console.error("Geocoding Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
