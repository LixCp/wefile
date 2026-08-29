/**
 * Signaling smoke test.
 * Starts against a running WeFile server and verifies:
 *  - identity registration + duplicate rejection
 *  - offer relay from sender to receiver
 *  - answer relay back to sender
 *  - ICE candidate forwarding
 *  - decline notification
 *
 * Usage: node scripts/smoke-signaling.mjs [port]
 */
import { io } from "socket.io-client";

const port = process.argv[2] || "3000";
const url = `http://localhost:${port}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(url, { path: "/socket.io/", transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("connection timeout")), 10_000);
  });
}

function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 10_000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

let sender;
let receiver;
try {
  sender = await connect();
  receiver = await connect();

  // Registration
  const regA = await new Promise((resolve) => sender.emit("identity:register", "AAAABBBB", resolve));
  check("sender registers identity", regA.ok === true);
  const regB = await new Promise((resolve) => receiver.emit("identity:register", "BBBBAAAA", resolve));
  check("receiver registers identity", regB.ok === true);

  const dupe = await new Promise((resolve) => {
    const third = io(url, { path: "/socket.io/", transports: ["websocket"] });
    third.on("connect", () => third.emit("identity:register", "AAAABBBB", resolve));
  });
  check("duplicate identity rejected while online", dupe.ok === false && typeof dupe.error === "string");

  const badOffer = await new Promise((resolve) =>
    sender.emit(
      "peer:offer",
      { target: "ZZZZZZZZ", transferId: "t0", file: { name: "x", size: 1, type: "text/plain" }, description: { type: "offer", sdp: "v=0" } },
      resolve,
    ),
  );
  check("offer to unknown identity rejected", badOffer.ok === false);

  // Offer relay
  const offerPromise = waitFor(receiver, "peer:offer");
  const sentOffer = await new Promise((resolve) =>
    sender.emit(
      "peer:offer",
      { target: "BBBBAAAA", transferId: "t1", file: { name: "test.bin", size: 1234, type: "application/octet-stream" }, description: { type: "offer", sdp: "v=0 fake" } },
      resolve,
    ),
  );
  check("offer acknowledged by server", sentOffer.ok === true);
  const offer = await offerPromise;
  check(
    "offer relayed to receiver with sender identity",
    offer.from === "AAAABBBB" && offer.transferId === "t1" && offer.file?.name === "test.bin",
    JSON.stringify(offer.file ?? {}),
  );

  // Answer relay
  const answerPromise = waitFor(sender, "peer:answer");
  await new Promise((resolve) => receiver.emit("peer:answer", { target: "AAAABBBB", transferId: "t1", description: { type: "answer", sdp: "v=0 fake-answer" } }, resolve));
  const answer = await answerPromise;
  check("answer relayed to sender", answer.from === "BBBBAAAA" && answer.transferId === "t1");

  // ICE forwarding
  const icePromise = waitFor(receiver, "peer:ice");
  sender.emit("peer:ice", { target: "BBBBAAAA", transferId: "t1", candidate: { candidate: "candidate:1 1 UDP 1 127.0.0.1 40000 typ host", sdpMid: "0" } });
  const ice = await icePromise;
  check("ICE candidate forwarded to receiver", ice.candidate?.candidate?.startsWith("candidate:1") === true);

  // Decline
  const declinePromise = waitFor(sender, "peer:decline");
  receiver.emit("peer:decline", { target: "AAAABBBB", transferId: "t1" });
  const decline = await declinePromise;
  check("decline relayed to sender", decline.transferId === "t1");
} catch (error) {
  console.error(error);
  results.push({ name: "unexpected error", ok: false, detail: String(error) });
} finally {
  sender?.close();
  receiver?.close();
  await delay(200);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
