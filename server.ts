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
  const hhtpServer = createServer((req, res) => handle(req, res));
  const io = new Server(hhtpServer);
  globalThis.io = io;
  io.on("connection", (socket: Socket) => {
    socket.on("register", () => {
      socket.emit("registered", "hello");
    });
  });
  hhtpServer.listen(port, () => {
    console.log(`> آماده روی http://localhost:${port}`);
  });
});
