"use client";

import { useState, useCallback, useRef } from "react";
import { SerializedProposal } from "@/lib/actions/proposals";
import { buildProposalDebateRequest } from "@/lib/ai/debate";
import { AI_WORKER_URL } from "@/lib/env";

export interface DebateEvent {
  event: string;
  data: any;
}

export interface DebateState {
  isStreaming: boolean;
  events: DebateEvent[];
  error: string | null;
  result: any | null;
}

export function useAIDebate() {
  const [state, setState] = useState<DebateState>({
    isStreaming: false,
    events: [],
    error: null,
    result: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startDebate = useCallback(async (proposal: SerializedProposal) => {
    setState({
      isStreaming: true,
      events: [],
      error: null,
      result: null,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let connectionTimedOut = false;
    const idleTimeoutMs = 30000;
    let timeoutId: number | null = null;
    const resetTimeout = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        connectionTimedOut = true;
        abortController.abort();
      }, idleTimeoutMs);
    };

    resetTimeout();

    try {
      const baseUrl = AI_WORKER_URL;
      console.log(`[AI Debate] Connecting to ${baseUrl}...`);
      
      const response = await fetch(`${baseUrl}/api/v1/debate/proposals/evaluate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(buildProposalDebateRequest(proposal)),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`AI Worker error (${response.status}): ${text || response.statusText}`);
      }

      resetTimeout();

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Body reader not available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetTimeout();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last partial line in buffer

        let currentEvent = "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("event: ")) {
            currentEvent = trimmedLine.replace("event: ", "").trim();
          } else if (trimmedLine.startsWith("data: ")) {
            const dataStr = trimmedLine.replace("data: ", "").trim();
            try {
              const data = JSON.parse(dataStr);
              console.log(`[AI Debate] Received event: ${currentEvent}`, data);
              
              if (currentEvent === "debate_completed") {
                setState(prev => ({ ...prev, result: data }));
              }
              
              if (currentEvent === "error") {
                setState(prev => ({ ...prev, error: data.message || "Unknown AI error" }));
              }

              setState(prev => ({
                ...prev,
                events: [...prev.events, { event: currentEvent, data }],
              }));
            } catch (e) {
              console.error("[AI Debate] Failed to parse SSE data", e, dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (connectionTimedOut) {
          const mixedContentHint =
            window.location.protocol === "https:" &&
            AI_WORKER_URL.startsWith("http://")
              ? " The configured AI worker uses HTTP, which browsers block from this HTTPS app."
              : "";
          const httpsEdgeHint =
            window.location.protocol === "https:" &&
            AI_WORKER_URL.startsWith("https://")
              ? " This app needs a working HTTPS listener on port 443 with a valid certificate. Plain HTTP on :8080 can work in curl but not from this browser."
              : "";
          setState((prev) => ({
            ...prev,
            error: `AI worker connection timed out while reaching ${AI_WORKER_URL}.${mixedContentHint}${httpsEdgeHint}`,
          }));
        } else {
          console.log("[AI Debate] Protocol aborted by user");
        }
      } else {
        console.error("[AI Debate] Protocol error:", err);
        setState(prev => ({ ...prev, error: err.message || "Failed to connect to AI worker" }));
      }
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, []);

  const stopDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    ...state,
    startDebate,
    stopDebate,
  };
}
