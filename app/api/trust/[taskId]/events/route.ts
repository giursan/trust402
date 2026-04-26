import { subscribe } from "@/lib/events";

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const unsub = subscribe(taskId, (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      });

      // Send initial heartbeat
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));

      // Clean up on abort
      req.signal.addEventListener("abort", () => {
        unsub();
        controller.close();
      });
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
