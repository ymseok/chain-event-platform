import { eventStore } from '@/lib/storage/event-store';
import type { SSEMessage } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: SSEMessage) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const recentEvents = eventStore.getRecentEvents(50);
      sendEvent({ type: 'init', events: recentEvents });

      const unsubscribe = eventStore.onEvent((event) => {
        try {
          sendEvent({ type: 'event', event });
        } catch {
          unsubscribe();
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      (controller as unknown as { signal?: AbortSignal }).signal?.addEventListener(
        'abort',
        cleanup
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
