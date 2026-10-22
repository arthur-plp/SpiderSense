import { subscribe } from "@/lib/server/events/live";
import { apiUser, route } from "@/lib/server/api";

const PING_MS = 25_000;

/**
 * GET /api/events/stream — Server-Sent Events: one `change` message per event
 * appended to the journal. It only says what changed (incident or hero, id):
 * the maps then reload through the regular routes, which check the access.
 */
export const GET = route(async (request) => {
  await apiUser();
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };
      // Reconnect after 3 s if the connection drops (EventSource does it by itself).
      send(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      const unsubscribe = subscribe((summary) => send(`id: ${summary.sequence}\nevent: change\ndata: ${JSON.stringify(summary)}\n\n`));
      // Proxies close idle connections: a comment line keeps it open.
      const ping = setInterval(() => send(": ping\n\n"), PING_MS);
      stop = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };
      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      // no-transform: the compression of `next start` would buffer the stream.
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
});
