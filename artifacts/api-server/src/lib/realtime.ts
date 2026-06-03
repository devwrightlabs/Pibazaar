import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAuthToken } from "./jwt";
import { logger } from "./logger";

type RealtimeEvent =
  | { type: "message"; payload: unknown }
  | { type: "notification"; payload: unknown }
  | { type: "escrow"; payload: unknown };

// userId -> set of live sockets
const clients = new Map<string, Set<WebSocket>>();

function add(userId: string, ws: WebSocket): void {
  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(ws);
}

function remove(userId: string, ws: WebSocket): void {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clients.delete(userId);
}

/** Push an event to all live sockets for a user. No-op if user is offline. */
export function emitToUser(userId: string, event: RealtimeEvent): void {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(event);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

/**
 * Attach a WebSocket server at /api/ws. The client authenticates by passing
 * the JWT as a `token` query param: wss://host/api/ws?token=...
 */
export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let pathname: string;
    try {
      pathname = new URL(req.url ?? "", "http://localhost").pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== "/api/ws") return;

    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const userId = payload.sub;
      add(userId, ws);
      ws.on("close", () => remove(userId, ws));
      ws.on("error", () => remove(userId, ws));
      ws.send(JSON.stringify({ type: "connected", payload: { userId } }));
    });
  });

  logger.info("Realtime WebSocket server attached at /api/ws");
}
