import next from "next";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  IDENTITY_PATTERN,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "./src/lib/socket-events";

declare global {
  var io: Server<ClientToServerEvents, ServerToClientEvents>;
}

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Let Socket.IO's own request listener handle its own paths.
    if (req.url?.startsWith("/socket.io")) {
      return;
    }
    return handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/socket.io/",
    maxHttpBufferSize: 100_000,
  });
  globalThis.io = io;

  const identities = new Map<string, string>();

  const normalizeIdentity = (value: string) => value.trim().toUpperCase();

  io.on("connection", (socket) => {
    let identity: string | null = null;

    const forwardTo = (target: string) => identities.get(normalizeIdentity(target));

    socket.on("identity:register", (rawIdentity, acknowledge) => {
      const nextIdentity = normalizeIdentity(rawIdentity);
      if (!IDENTITY_PATTERN.test(nextIdentity)) {
        acknowledge({ ok: false, error: "شناسه نامعتبر است" });
        return;
      }

      const owner = identities.get(nextIdentity);
      if (owner && owner !== socket.id) {
        acknowledge({ ok: false, error: "این شناسه هم‌اکنون آنلاین است" });
        return;
      }

      if (identity && identities.get(identity) === socket.id) identities.delete(identity);
      identity = nextIdentity;
      identities.set(identity, socket.id);
      socket.emit("identity:registered", identity);
      acknowledge({ ok: true });
    });

    socket.on("peer:offer", (payload, acknowledge) => {
      if (!identity) {
        acknowledge({ ok: false, error: "ابتدا باید شناسه ثبت شود" });
        return;
      }
      const target = normalizeIdentity(payload.target);
      const targetSocket = identities.get(target);
      if (!targetSocket || target === identity) {
        acknowledge({ ok: false, error: "گیرنده آنلاین نیست یا شناسه صحیح نیست" });
        return;
      }
      io.to(targetSocket).emit("peer:offer", {
        from: identity,
        transferId: payload.transferId,
        file: payload.file,
        description: payload.description,
      });
      acknowledge({ ok: true });
    });

    socket.on("peer:answer", (payload, acknowledge) => {
      if (!identity) {
        acknowledge({ ok: false, error: "فرستنده ثبت نشده است" });
        return;
      }
      const targetSocket = identities.get(normalizeIdentity(payload.target));
      if (!targetSocket) {
        acknowledge({ ok: false, error: "فرستنده دیگر آنلاین نیست" });
        return;
      }
      io.to(targetSocket).emit("peer:answer", {
        from: identity,
        transferId: payload.transferId,
        description: payload.description,
      });
      acknowledge({ ok: true });
    });

    socket.on("peer:ice", ({ target, transferId, candidate }) => {
      const targetSocket = forwardTo(target);
      if (!identity || !targetSocket) return;
      io.to(targetSocket).emit("peer:ice", { from: identity, transferId, candidate });
    });

    socket.on("peer:decline", ({ target, transferId }) => {
      const targetSocket = forwardTo(target);
      if (!identity || !targetSocket) return;
      io.to(targetSocket).emit("peer:decline", { from: identity, transferId });
    });

    socket.on("peer:cancel", ({ target, transferId }) => {
      const targetSocket = forwardTo(target);
      if (!identity || !targetSocket) return;
      io.to(targetSocket).emit("peer:cancel", { from: identity, transferId });
    });

    socket.on("disconnect", () => {
      if (identity && identities.get(identity) === socket.id) identities.delete(identity);
    });
  });

  httpServer.listen(port, process.env.HOST || "0.0.0.0", () => {
    console.log(`> Ready on http://0.0.0.0:${port} (HOST=${process.env.HOST || "0.0.0.0"})`);
    console.log(`> NODE_ENV=${process.env.NODE_ENV ?? "<unset>"}`);
  });
}).catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
