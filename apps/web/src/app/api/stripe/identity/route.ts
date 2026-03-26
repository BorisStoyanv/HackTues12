import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia", // Adjust as necessary
});

export async function POST(req: Request) {
  try {
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
