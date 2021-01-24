import { RoomId, Color, PlayerId } from "../types";

export interface SocketEvent<T extends string, U> {
  type: T;
  payload: U;
}

export type JoinPayload = {
  type: "REQUEST_JOIN";
  data: { roomId: RoomId; color: Color; hostIfNeeded?: boolean };
};
export type HostPayload = { type: "REQUEST_HOST"; data: { color: Color } };

export type P2PManagementEvent_client = SocketEvent<
  "P2P_MANAGEMENT__CLIENT",
  JoinPayload | HostPayload
>;

export type RoomJoinSuccessPayload = {
  type: "ROOM_JOIN_SUCCESS";
  data: { isHost: boolean; isNewRoom: boolean; roomId: RoomId; color: Color };
};
export type RoomJoinFailurePayload = {
  type: "ROOM_JOIN_FAILURE";
  data: { roomId: RoomId; failureMessage: string; color: Color };
};
export type NewHostPayload = {
  type: "NEW_HOST";
  data: { hostId: PlayerId };
};
export type P2PManagementEvent_server = SocketEvent<
  "P2P_MANAGEMENT__SERVER",
  RoomJoinSuccessPayload | RoomJoinFailurePayload | NewHostPayload
>;

export type BroadcastRoomEvent<T> = SocketEvent<
  "BROADCAST_ROOM",
  { messages: T[] }
>;
export type EmitToHostEvent<T> = SocketEvent<"EMIT_TO_HOST", { messages: T[] }>;

export type P2PManagementEvent =
  | P2PManagementEvent_server
  | P2PManagementEvent_client;

export type ServerErrorEvent = SocketEvent<
  "UNHANDLED_ERROR",
  { message: string; extra: any }
>;
