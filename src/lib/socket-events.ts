export const IDENTITY_PATTERN = /^[A-Z0-9]{8}$/;

export type TransferFile = {
  name: string;
  size: number;
  type: string;
};

export type SignalDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type SignalCandidate = RTCIceCandidateInit;

export type SignalAck = {
  ok: boolean;
  error?: string;
};

export type ServerToClientEvents = {
  "identity:registered": (identity: string) => void;
  "peer:offer": (payload: {
    from: string;
    transferId: string;
    file: TransferFile;
    description: SignalDescription;
  }) => void;
  "peer:answer": (payload: {
    from: string;
    transferId: string;
    description: SignalDescription;
  }) => void;
  "peer:ice": (payload: {
    from: string;
    transferId: string;
    candidate: SignalCandidate;
  }) => void;
  "peer:decline": (payload: { from: string; transferId: string }) => void;
  "peer:cancel": (payload: { from: string; transferId: string }) => void;
};

export type ClientToServerEvents = {
  "identity:register": (identity: string, acknowledge: (result: SignalAck) => void) => void;
  "peer:offer": (
    payload: {
      target: string;
      transferId: string;
      file: TransferFile;
      description: SignalDescription;
    },
    acknowledge: (result: SignalAck) => void,
  ) => void;
  "peer:answer": (
    payload: { target: string; transferId: string; description: SignalDescription },
    acknowledge: (result: SignalAck) => void,
  ) => void;
  "peer:ice": (payload: {
    target: string;
    transferId: string;
    candidate: SignalCandidate;
  }) => void;
  "peer:decline": (payload: { target: string; transferId: string }) => void;
  "peer:cancel": (payload: { target: string; transferId: string }) => void;
};