import type { Color, RoomId } from "@kotan/shared/types";
import type { UseStore } from "zustand";

export type ConnectionStatus =
  | "Initial"
  | "Disconnected"
  | "Lobby"
  | "Joining"
  | "Room";

export type PublicP2PState = {
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  roomId?: RoomId;
  color?: Color;
  failureMessage?: string;
};

/**
 * EmitType: A message that the host should receive. These will be "RequestedEvent" messages.
 * BroadcastType: A message that the host intends for every client to receive. These will be "VerifiedEvent" messages
 */
export interface P2PManager<EmitType, BroadcastType> {
  requestCreateRoom({ color }: { color: Color }): void;
  requestJoinRoom({ roomId, color }: { roomId: RoomId; color: Color }): void;

  // TODO: this would be nice to do with some fancy generic constructor instead.
  initHandlers: ({
    onReceiveBroadcast,
    onReceiveEmit,
  }: {
    acceptMessage: (message: EmitType) => BroadcastType;
    onReceiveBroadcast: (messages: BroadcastType[]) => void;
    onReceiveEmit: (messages: EmitType[]) => void;
  }) => void;

  broadcastToRoom: (messages: BroadcastType[]) => void;
  emitToHost: (messages: EmitType[]) => void;

  // read only state exposed via a zustand store
  useP2PStore: UseStore<PublicP2PState>;
}
