"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useState } from "react";

/**
 * Singleton socket shared across every consumer of useSocket().
 * Prevents opening one WebSocket per component.
 */
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io/" });
  }
  return sharedSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Sync initial state in case the socket already connected earlier.
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { connected };
}