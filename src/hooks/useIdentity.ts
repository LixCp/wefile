"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import { generateID } from "@/actions/generateid";
import type { AppSocket } from "./useSocket";
import type { SignalAck } from "@/lib/socket-events";
import { useToast } from "./useToast";

export function useIdentity(socket: AppSocket) {
  const [code, setCode] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const { toast } = useToast();

  // Resolve a persistent identity from localStorage (or mint a fresh one).
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        let nextCode = localStorage.getItem("ft_code");
        if (!nextCode) {
          const result = await generateID();
          nextCode = result.id;
          localStorage.setItem("ft_code", nextCode);
        }
        if (active) setCode(nextCode);
      } catch {
        if (active) toast({ title: "خطا در ساخت شناسه" });
      }
    }
    initialize();
    return () => {
      active = false;
    };
  }, [toast]);

  // Register the identity against the signaling server.
  // Runs on mount (if already connected) and after every reconnect,
  // because the server drops registrations on disconnect.
  useEffect(() => {
    if (!code) return;
    let active = true;

    const tryRegister = async () => {
      let current = code;
      let attempts = 0;

      while (active) {
        const result = await new Promise<SignalAck>((resolve) =>
          socket.emit("identity:register", current, resolve),
        );
        if (!active) return;

        if (result.ok) {
          setRegistered(true);
          return;
        }

        // Another tab/device is holding this exact identity right now;
        // mint a fresh one locally and try again a couple of times.
        if (result.error?.includes("آنلاین") && attempts < 2) {
          attempts += 1;
          try {
            const generated = await generateID();
            if (!active) return;
            current = generated.id;
            localStorage.setItem("ft_code", current);
            setCode(current);
          } catch {
            if (active) toast({ title: "خطا در ساخت شناسه" });
            return;
          }
          continue;
        }

        setRegistered(false);
        toast({ title: "خطا در ثبت شناسه", description: result.error });
        return;
      }
    };

    if (socket.connected) void tryRegister();
    const handleConnect = () => void tryRegister();
    const handleDisconnect = () => setRegistered(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      active = false;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [code, socket, toast]);

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "✨ کد آماده‌ست، بچسبونش هر جا دوست داری" });
    } catch {
      toast({ title: "کپی ناموفق بود", description: "دسترسی کلیپ‌بورد در دسترس نیست" });
    }
  }, [code, toast]);

  return { code, registered, copyCode };
}
