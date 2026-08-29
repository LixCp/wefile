"use client";

import { io, type Socket } from "socket.io-client";
import { useSyncExternalStore } from "react";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";

/**
 * Singleton socket shared across every consumer of useSocket().
 * Prevents opening one WebSocket per component.
 */
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io/" });
  }
  return sharedSocket;
}

export function useSocket() {
  const connected = useSyncExternalStore(
    (onStoreChange) => {
      const socket = getSocket();
      socket.on("connect", onStoreChange);
      socket.on("disconnect", onStoreChange);
      // Sync initial value in case the socket already connected earlier.
      if (socket.connected) queueMicrotask(onStoreChange);
      return () => {
        socket.off("connect", onStoreChange);
        socket.off("disconnect", onStoreChange);
      };
    },
    () => getSocket().connected,
    () => false,
  );

  return { connected, socket: getSocket() };
}