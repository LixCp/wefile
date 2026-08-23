import next from "next";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";

declare global {
  var io: Server;
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

  const io = new Server(httpServer, {
    path: "/socket.io/",
  });
  globalThis.io = io;

  io.on("connection", (socket: Socket) => {
    socket.on("register", () => {
      socket.emit("registered", "hello");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});