import { subscribeGlobal } from "@/lib/events";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeGlobal((event, data) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          unsubscribe();
        }
      });

      // Keepalive every 15s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
          unsubscribe();
        }
      }, 15000);

      // Cleanup when client disconnects
      const cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
      };

      // Store cleanup for when the stream is cancelled
      (controller as any)._cleanup = cleanup;
    },
    cancel(controller) {
      (controller as any)?._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
