import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
    });

    const { role } = await req.json();

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        role,
      },
      // You can require specific checks depending on the role
      options: {
        document: {
          require_id_number: role === "regional" ? false : false,
          require_matching_selfie: false,
          require_live_capture: false,
        },
      },
    });

    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      session_id: verificationSession.id,
    });
  } catch (error) {
    console.error("Error creating Stripe Identity session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
