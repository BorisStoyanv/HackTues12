import { NextResponse } from "next/server";

// Using Node.js runtime instead of edge to potentially fix fetch issues with non-standard ports/certs
export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const baseUrl =
			process.env.AI_WORKER_URL || "http://ai.open-ft.app:8080";

		console.log(`[AI Proxy] Forwarding request to: ${baseUrl}`);

		const response = await fetch(
			`${baseUrl}/api/v1/debate/proposals/evaluate/stream`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				body: JSON.stringify(body),
				// Important for SSE streaming
				cache: "no-store",
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[AI Proxy] Upstream Error (${response.status}):`,
				errorText,
			);
			return new Response(errorText, {
				status: response.status,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!response.body) {
			throw new Error("No response body from AI Worker");
		}

		// Proxy the stream using the transform stream pattern for stability
		const { readable, writable } = new TransformStream();
		response.body.pipeTo(writable);

		return new Response(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no", // Disable buffering for Nginx if present
			},
		});
	} catch (error: any) {
		console.error("[AI Proxy] Fatal Error:", error);

		// Log more detail about the fetch failure
		if (error.cause) {
			console.error("[AI Proxy] Fetch Cause:", error.cause);
		}

		return NextResponse.json(
			{
				error: error.message || "Internal Server Error",
				details: error.cause?.message,
			},
			{ status: 500 },
		);
	}
}
