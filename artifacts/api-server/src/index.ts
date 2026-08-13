import { createServer } from "node:http";
import { initDb } from "@workspace/db";
import { logger } from "./lib/logger";
import { attachRealtime } from "./lib/realtime";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// initDb FIRST — initialises the db/pool bindings before any route fires.
await initDb();

// Import app AFTER initDb so the module-level db binding is live.
const { default: app } = await import("./app.js");

const server = createServer(app);
attachRealtime(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
