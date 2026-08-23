"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io/" });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("hello", "world");
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  return {
    socket: socketRef.current,
    socketRef,
    connected,
  };
}