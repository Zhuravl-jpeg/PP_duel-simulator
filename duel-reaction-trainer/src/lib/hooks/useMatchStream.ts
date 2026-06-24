"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MatchEventType =
  | "ROUND_STARTED"
  | "REACTION_SUBMITTED"
  | "ROUND_FINISHED"
  | "MATCH_FINISHED"
  | "keepalive";

export interface MatchEventPayload {
  event: MatchEventType;
  data: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Хук для подписки на SSE-стрим состояния матча.
 * Автоматически переподключается при обрыве связи.
 * 
 * @param matchId - ID матча для подписки
 * @returns объект с состоянием стрима и последним событием
 */
export function useMatchStream(matchId: string | undefined) {
  const [lastEvent, setLastEvent] = useState<MatchEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    if (!matchId) return;

    // Отменяем предыдущее подключение
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsConnected(false);

    const url = `/api/match/${matchId}/stream`;

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("ReadableStream not available");

        setIsConnected(true);
        setError(null);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    setLastEvent({
                      event: data.type || "keepalive",
                      data: data.payload || {},
                      timestamp: data.timestamp,
                    });
                  } catch (e) {
                    // Игнорируем не-JSON данные (например, keepalive)
                  }
                }
              }
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
            setError(err as Error);
          } finally {
            setIsConnected(false);
          }
        };

        processStream();
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err);
        setIsConnected(false);
      });
  }, [matchId]);

  useEffect(() => {
    connect();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { lastEvent, isConnected, error };
}
