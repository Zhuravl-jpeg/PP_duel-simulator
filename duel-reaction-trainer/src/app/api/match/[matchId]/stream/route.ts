import { NextRequest } from "next/server";
import { subscribeToMatch } from "@/server/utils/event-stream";

export async function GET(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  // Проверяем существование матча через tRPC/сервис (заглушка для демо)
  // В реальном проекте здесь будет запрос к БД: await db.query.matches.findFirst(...)
  
  const { stream, unsubscribe } = subscribeToMatch(matchId);

  const encoder = new TextEncoder();
  
  // Обёртка над стримом для отправки initial keepalive
  const body = new ReadableStream({
    async start(controller) {
      // Отправляем заголовок Keep-Alive для предотвращения таймаутов прокси
      const keepAlive = `:ok\n\nevent: keepalive\ndata: ${Date.now()}\n\n`;
      controller.enqueue(encoder.encode(keepAlive));
      
      // Подписываемся на события матчей
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
        unsubscribe();
        controller.close();
      }
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Для Nginx
    },
  });
}
