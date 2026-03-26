"use client";

import { useState, useCallback, useRef } from "react";
import { SerializedProposal } from "@/lib/actions/proposals";

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

    try {
      const baseUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL || "http://localhost:3001";
      
      const response = await fetch(`${baseUrl}/api/v1/debate/proposals/evaluate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal: {
            name: proposal.title,
            location: proposal.region_tag,
            category: proposal.category,
            info: proposal.description,
            neededFunds: proposal.budget_amount,
            currency: proposal.budget_currency,
          },
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`AI Worker error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("Body reader not available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.replace("event: ", "").trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            try {
              const data = JSON.parse(dataStr);
              
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
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Debate aborted");
      } else {
        setState(prev => ({ ...prev, error: err.message || "Failed to connect to AI worker" }));
      }
    } finally {
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, []);

  const stopDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    ...state,
    startDebate,
    stopDebate,
  };
}
