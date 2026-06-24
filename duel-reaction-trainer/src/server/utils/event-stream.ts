/**
 * Простой in-memory event bus для SSE-стриминга состояний матчей.
 * В production (Vercel/Railway) рекомендуется заменить на Redis Pub/Sub.
 */

type MatchEvent = {
  matchId: string;
  type: "ROUND_STARTED" | "REACTION_SUBMITTED" | "ROUND_FINISHED" | "MATCH_FINISHED";
  payload: Record<string, unknown>;
  timestamp: number;
};

// matchId -> Set<Writer>
const subscribers = new Map<string, Set<WritableStreamDefaultWriter<Uint8Array>>>();

export function subscribeToMatch(matchId: string): {
  stream: ReadableStream<Uint8Array>;
  unsubscribe: () => void;
} {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  if (!subscribers.has(matchId)) {
    subscribers.set(matchId, new Set());
  }
  subscribers.get(matchId)!.add(writer);

  // Cleanup при отключении клиента
  const unsubscribe = () => {
    writer.releaseLock();
    subscribers.get(matchId)?.delete(writer);
    if (subscribers.get(matchId)?.size === 0) {
      subscribers.delete(matchId);
    }
  };

  // Автоматическая очистка при ошибке записи (клиент отключился)
  writer.ready.then(() => {
    // Подписка активна
  }).catch(unsubscribe);

  return { stream: readable, unsubscribe };
}

export function emitMatchEvent(event: MatchEvent): void {
  const writers = subscribers.get(event.matchId);
  if (!writers || writers.size === 0) return;

  const data = `event: match_update\ndata: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const writer of writers) {
    writer.write(encoded).catch(() => {
      // Клиент отключился, игнорируем
    });
  }
}
