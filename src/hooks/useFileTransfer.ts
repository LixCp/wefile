"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSocket } from "@/hooks/useSocket";
import type { SignalAck, SignalCandidate, SignalDescription, TransferFile } from "@/lib/socket-events";

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = 1024 * 1024;
export const MAX_FILE_SIZE = 512 * 1024 * 1024;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type TransferStatus =
  | "waiting"
  | "connecting"
  | "transferring"
  | "completed"
  | "declined"
  | "cancelled"
  | "failed";

export type TransferRecord = TransferFile & {
  id: string;
  peer: string;
  direction: "incoming" | "outgoing";
  progress: number;
  status: TransferStatus;
  error?: string;
  downloadUrl?: string;
};

type IncomingOffer = {
  from: string;
  transferId: string;
  file: TransferFile;
  description: SignalDescription;
};

type ActiveTransfer = {
  id: string;
  peer: string;
  connection: RTCPeerConnection;
  channel: RTCDataChannel | null;
};

function toDescription(description: RTCSessionDescriptionInit): SignalDescription {
  if (!description.sdp || (description.type !== "offer" && description.type !== "answer")) {
    throw new Error("پاسخ WebRTC نامعتبر است");
  }
  return { type: description.type, sdp: description.sdp };
}

function waitForBuffer(channel: RTCDataChannel): Promise<void> {
  if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return Promise.resolve();
  channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;
  return new Promise((resolve, reject) => {
    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("ارتباط هنگام ارسال قطع شد"));
    };
    const cleanup = () => {
      channel.removeEventListener("bufferedamountlow", onLow);
      channel.removeEventListener("close", onClose);
    };
    channel.addEventListener("bufferedamountlow", onLow, { once: true });
    channel.addEventListener("close", onClose, { once: true });
  });
}

export function useFileTransfer(socket: AppSocket, identity: string | null, registered: boolean) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);
  const activeRef = useRef<ActiveTransfer | null>(null);
  const pendingIceRef = useRef<Map<string, SignalCandidate[]>>(new Map());
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef(0);

  const updateTransfer = useCallback((id: string, update: Partial<TransferRecord>) => {
    setTransfers((current) =>
      current.map((transfer) => (transfer.id === id ? { ...transfer, ...update } : transfer)),
    );
  }, []);

  const closeActive = useCallback((id?: string) => {
    const active = activeRef.current;
    if (!active || (id && active.id !== id)) return;
    active.channel?.close();
    active.connection.close();
    activeRef.current = null;
    receivedChunksRef.current = [];
    receivedBytesRef.current = 0;
  }, []);

  const addPendingIce = useCallback(async (transferId: string, candidate: SignalCandidate) => {
    const active = activeRef.current;
    if (active?.id === transferId && active.connection.remoteDescription) {
      await active.connection.addIceCandidate(candidate);
      return;
    }
    const candidates = pendingIceRef.current.get(transferId) ?? [];
    candidates.push(candidate);
    pendingIceRef.current.set(transferId, candidates);
  }, []);

  const flushPendingIce = useCallback(async (transferId: string, connection: RTCPeerConnection) => {
    const candidates = pendingIceRef.current.get(transferId) ?? [];
    for (const candidate of candidates) await connection.addIceCandidate(candidate);
    pendingIceRef.current.delete(transferId);
  }, []);

  const createConnection = useCallback(
    (transferId: string, peer: string) => {
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      connection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("peer:ice", {
            target: peer,
            transferId,
            candidate: candidate.toJSON(),
          });
        }
      };
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "connected") {
          updateTransfer(transferId, { status: "transferring" });
        }
        if (connection.connectionState === "failed") {
          updateTransfer(transferId, { status: "failed", error: "برقراری ارتباط مستقیم ناموفق بود" });
          closeActive(transferId);
        }
      };
      return connection;
    },
    [closeActive, socket, updateTransfer],
  );

  const sendFile = useCallback(
    async (target: string, file: File) => {
      if (!identity || !registered) throw new Error("اتصال به سرور هنوز برقرار نشده است");
      if (activeRef.current || incomingOffer) throw new Error("ابتدا انتقال فعلی را تمام کنید");
      if (file.size > MAX_FILE_SIZE) throw new Error("حداکثر حجم فایل ۵۱۲ مگابایت است");

      const peer = target.trim().toUpperCase();
      const transferId = crypto.randomUUID();
      const metadata: TransferFile = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      };
      setTransfers((current) => [
        { ...metadata, id: transferId, peer, direction: "outgoing", progress: 0, status: "connecting" },
        ...current,
      ]);

      try {
        const connection = createConnection(transferId, peer);
        const channel = connection.createDataChannel("file", { ordered: true });
        channel.binaryType = "arraybuffer";
        activeRef.current = { id: transferId, peer, connection, channel };

        channel.onopen = async () => {
          try {
            updateTransfer(transferId, { status: "transferring" });
            let offset = 0;
            while (offset < file.size && channel.readyState === "open") {
              await waitForBuffer(channel);
              const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
              channel.send(chunk);
              offset += chunk.byteLength;
              updateTransfer(transferId, { progress: Math.round((offset / file.size) * 100) });
            }
            if (channel.readyState !== "open") throw new Error("ارتباط هنگام ارسال قطع شد");
            channel.send(JSON.stringify({ type: "complete" }));
          } catch (error) {
            updateTransfer(transferId, {
              status: "failed",
              error: error instanceof Error ? error.message : "ارسال فایل ناموفق بود",
            });
            closeActive(transferId);
          }
        };
        channel.onmessage = ({ data }) => {
          if (typeof data !== "string") return;
          const message = JSON.parse(data) as { type?: string };
          if (message.type === "received") {
            updateTransfer(transferId, { progress: 100, status: "completed" });
            window.setTimeout(() => closeActive(transferId), 300);
          }
        };

        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        const result = await new Promise<SignalAck>((resolve) => {
          socket.emit(
            "peer:offer",
            { target: peer, transferId, file: metadata, description: toDescription(offer) },
            resolve,
          );
        });
        if (!result.ok) throw new Error(result.error || "ارسال درخواست ناموفق بود");
        updateTransfer(transferId, { status: "waiting" });
      } catch (error) {
        updateTransfer(transferId, {
          status: "failed",
          error: error instanceof Error ? error.message : "ارسال درخواست ناموفق بود",
        });
        closeActive(transferId);
      }
    },
    [closeActive, createConnection, identity, incomingOffer, registered, socket, updateTransfer],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingOffer || activeRef.current) return;
    const offer = incomingOffer;
    setIncomingOffer(null);
    setTransfers((current) => [
      {
        ...offer.file,
        id: offer.transferId,
        peer: offer.from,
        direction: "incoming",
        progress: 0,
        status: "connecting",
      },
      ...current,
    ]);

    try {
      const connection = createConnection(offer.transferId, offer.from);
      activeRef.current = { id: offer.transferId, peer: offer.from, connection, channel: null };
      connection.ondatachannel = ({ channel }) => {
        channel.binaryType = "arraybuffer";
        if (activeRef.current?.id === offer.transferId) activeRef.current.channel = channel;
        receivedChunksRef.current = [];
        receivedBytesRef.current = 0;
        channel.onmessage = ({ data }) => {
          if (data instanceof ArrayBuffer) {
            receivedChunksRef.current.push(data);
            receivedBytesRef.current += data.byteLength;
            updateTransfer(offer.transferId, {
              status: "transferring",
              progress: Math.min(100, Math.round((receivedBytesRef.current / offer.file.size) * 100)),
            });
            return;
          }
          if (typeof data === "string") {
            const message = JSON.parse(data) as { type?: string };
            if (message.type === "complete") {
              if (receivedBytesRef.current !== offer.file.size) {
                updateTransfer(offer.transferId, { status: "failed", error: "فایل به‌طور کامل دریافت نشد" });
                closeActive(offer.transferId);
                return;
              }
              const blob = new Blob(receivedChunksRef.current, { type: offer.file.type });
              const downloadUrl = URL.createObjectURL(blob);
              updateTransfer(offer.transferId, { progress: 100, status: "completed", downloadUrl });
              channel.send(JSON.stringify({ type: "received" }));
              window.setTimeout(() => closeActive(offer.transferId), 300);
            }
          }
        };
      };
      await connection.setRemoteDescription(offer.description);
      await flushPendingIce(offer.transferId, connection);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      const result = await new Promise<SignalAck>((resolve) => {
        socket.emit(
          "peer:answer",
          { target: offer.from, transferId: offer.transferId, description: toDescription(answer) },
          resolve,
        );
      });
      if (!result.ok) throw new Error(result.error || "پذیرش انتقال ناموفق بود");
    } catch (error) {
      updateTransfer(offer.transferId, {
        status: "failed",
        error: error instanceof Error ? error.message : "پذیرش انتقال ناموفق بود",
      });
      closeActive(offer.transferId);
    }
  }, [closeActive, createConnection, flushPendingIce, incomingOffer, socket, updateTransfer]);

  const declineIncoming = useCallback(() => {
    if (!incomingOffer) return;
    socket.emit("peer:decline", { target: incomingOffer.from, transferId: incomingOffer.transferId });
    pendingIceRef.current.delete(incomingOffer.transferId);
    setIncomingOffer(null);
  }, [incomingOffer, socket]);

  const cancelTransfer = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    socket.emit("peer:cancel", { target: active.peer, transferId: active.id });
    updateTransfer(active.id, { status: "cancelled" });
    closeActive(active.id);
  }, [closeActive, socket, updateTransfer]);

  useEffect(() => {
    const onOffer = (offer: IncomingOffer) => {
      if (activeRef.current || incomingOffer) {
        socket.emit("peer:decline", { target: offer.from, transferId: offer.transferId });
        return;
      }
      setIncomingOffer(offer);
    };
    const onAnswer = async ({ transferId, description }: { from: string; transferId: string; description: SignalDescription }) => {
      const active = activeRef.current;
      if (!active || active.id !== transferId) return;
      await active.connection.setRemoteDescription(description);
      await flushPendingIce(transferId, active.connection);
      updateTransfer(transferId, { status: "connecting" });
    };
    const onIce = ({ transferId, candidate }: { from: string; transferId: string; candidate: SignalCandidate }) => {
      void addPendingIce(transferId, candidate);
    };
    const onDecline = ({ transferId }: { from: string; transferId: string }) => {
      updateTransfer(transferId, { status: "declined", error: "گیرنده درخواست را رد کرد" });
      closeActive(transferId);
    };
    const onCancel = ({ transferId }: { from: string; transferId: string }) => {
      updateTransfer(transferId, { status: "cancelled", error: "طرف مقابل انتقال را لغو کرد" });
      closeActive(transferId);
    };

    socket.on("peer:offer", onOffer);
    socket.on("peer:answer", onAnswer);
    socket.on("peer:ice", onIce);
    socket.on("peer:decline", onDecline);
    socket.on("peer:cancel", onCancel);
    return () => {
      socket.off("peer:offer", onOffer);
      socket.off("peer:answer", onAnswer);
      socket.off("peer:ice", onIce);
      socket.off("peer:decline", onDecline);
      socket.off("peer:cancel", onCancel);
    };
  }, [addPendingIce, closeActive, flushPendingIce, incomingOffer, socket, updateTransfer]);

  const lastTransfersRef = useRef<TransferRecord[]>([]);
  useEffect(() => {
    lastTransfersRef.current = transfers;
  }, [transfers]);
  useEffect(() => {
    return () => {
      closeActive();
      // Revoke object URLs only when the whole workspace unmounts,
      // otherwise completed downloads would stop working mid-session.
      for (const transfer of lastTransfersRef.current) {
        if (transfer.downloadUrl) URL.revokeObjectURL(transfer.downloadUrl);
      }
    };
  }, [closeActive]);

  return {
    transfers,
    incomingOffer,
    busy: Boolean(incomingOffer) || ["waiting", "connecting", "transferring"].some((status) =>
      transfers.some((transfer) => transfer.status === status),
    ),
    sendFile,
    acceptIncoming,
    declineIncoming,
    cancelTransfer,
  };
}