import { NextResponse } from "next/server";

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
    const data = await res.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "Could not resolve address. Please check and try again." },
        { status: 404 }
      );
    }

    const addressComponents = data.results[0].address_components;
    const { lat, lng } = data.results[0].geometry.location;
    
    let city = "Unknown City";
    let country = "Unknown Country";

    for (const component of addressComponents) {
      if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (component.types.includes("administrative_area_level_1") && city === "Unknown City") {
         // Fallback to state/region if locality isn't present
         city = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
      }
    }

    return NextResponse.json({
      city,
      country,
      lat,
      lng,
      formattedAddress: data.results[0].formatted_address
    });
  } catch (error) {
    console.error("Geocoding Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
