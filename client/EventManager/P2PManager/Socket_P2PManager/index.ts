import { createP2PStore } from "../P2PStore";
import type { Color, RoomId, PlayerId } from "@ESP/shared/types";
import type {
  SocketEvent,
  EmitToHostEvent,
  BroadcastRoomEvent,
  P2PManagementEvent_server,
  P2PManagementEvent_client,
  BroadcastHistoryEvent,
  BroadcastHistoryRequest,
  BroadcastHistoryResponse,
} from "@ESP/shared/socket/types";
import type { P2PManager, PublicP2PState } from "../types";

import { io, Socket } from "socket.io-client";
import { UseStore } from "zustand";

const endpoint = "http://localhost:5000";

/**
 * Events to host or to server.
 * Cannot be a P2PManagementEvent_server event
 */
type OutgoingEvent<EmitT, BroadcastT> =
  | BroadcastHistoryEvent<BroadcastT>
  | P2PManagementEvent_client
  | BroadcastRoomEvent<BroadcastT>
  | EmitToHostEvent<EmitT>;

/**
 * Events from host or from server.
 * Cannot be a P2PManagementEvent_client event
 */
type IncomingEvent<EmitT, BroadcastT> =
  | BroadcastHistoryEvent<BroadcastT>
  | P2PManagementEvent_server
  | BroadcastRoomEvent<BroadcastT>
  | EmitToHostEvent<EmitT>;

// Pass the generics; this layer doesn't care about the event types.
class Socket_P2PManager<EmitT, BroadcastT>
  implements P2PManager<EmitT, BroadcastT> {
  useP2PStore: UseStore<PublicP2PState>;
  private socket: Socket;

  constructor() {
    console.group("Socket_P2PManager | Constructor");

    console.log("Creating P2P Store...");
    this.useP2PStore = createP2PStore();

    console.log("Creating Socket...");
    this.socket = io(endpoint);

    this.socket.onAny((type, payload) => this.handleEvent({ type, payload }));

    this.socket.on("connect", () => {
      console.group("Socket_P2PManager | Connected!");

      const { connectionStatus, roomId, color } = this.useP2PStore.getState();

      if (connectionStatus !== "Initial" && roomId) {
        console.log(
          `Attempting to reconnect to previous found room: ${roomId}`
        );
        this.requestJoinRoom({ roomId, color, hostIfNeeded: true });
      } else {
        console.log("No previous room found. Entering lobby.");
        this.useP2PStore.setState({
          connectionStatus: "Lobby",
        });
      }

      console.groupEnd();
    });

    // Inform zustand that we are no longer connected
    this.socket.on("disconnect", (reason) => {
      console.group("Socket_P2PManager | Disconnected!");
      this.useP2PStore.setState({
        isHost: false, // Assume not host whenever a disconnect happens! Server will attempt to reassign to someone else.
        connectionStatus: "Disconnected",
        failureMessage: reason,
      });
      console.groupEnd();
    });

    this.handlersInitialized = false;

    console.groupEnd();
  }

  private _onReceiveBroadcastHandler: (messages: BroadcastT[]) => void;
  private _onReceiveEmitHandler: (messages: EmitT[]) => void;
  private _onReceiveBroadcastHistoryRequest: (requester) => void;
  private _onReceiveBroadcastHistoryResponse: (messages: BroadcastT[]) => void;
  private handlersInitialized: boolean;

  /**
   * Setup the side affects for when the socket gets incoming data (After validating that the data is good)
   */
  initHandlers = ({
    onReceiveBroadcast,
    onReceiveEmit,
    onReceiveBroadcastHistoryRequest,
    onReceiveBroadcastHistoryResponse,
  }: {
    onReceiveBroadcast: (messages: BroadcastT[]) => void;
    onReceiveEmit: (messages: EmitT[]) => void;
    onReceiveBroadcastHistoryRequest: (requester) => void;
    onReceiveBroadcastHistoryResponse: (messages: BroadcastT[]) => void;
  }): void => {
    if (this.handlersInitialized) {
      console.error("Socket P2P Manager | Cannot re-initialize handlers!");
    }
    console.log("Socket P2P Manager | Setting up handlers");
    this._onReceiveBroadcastHandler = onReceiveBroadcast;
    this._onReceiveEmitHandler = onReceiveEmit;
    this._onReceiveBroadcastHistoryRequest = onReceiveBroadcastHistoryRequest;
    this._onReceiveBroadcastHistoryResponse = onReceiveBroadcastHistoryResponse;
    this.handlersInitialized = true;
  };

  private _onReceiveEmit = (event: EmitToHostEvent<EmitT>) => {
    console.group("Socket P2P Manager | onReceiveEmit ");
    console.log("Messages: ", event.payload.messages);

    const { isHost } = this.useP2PStore.getState();
    if (!isHost) {
      console.error(
        "Socket P2P Manager | cannot receive an emit because not host"
      );
      return;
    }

    this._onReceiveEmitHandler(event.payload.messages);

    console.groupEnd();
  };

  private _onReceiveBroadcast = (event: BroadcastRoomEvent<BroadcastT>) => {
    console.group("Socket P2P Manager | onReceiveEmit ");
    console.log("Messages: ", event.payload.messages);

    const { isHost } = this.useP2PStore.getState();
    if (isHost) {
      console.error("Socket P2P Manager | cannot broadcast because is host");
      return;
    }

    this._onReceiveBroadcastHandler(event.payload.messages);

    console.groupEnd();
  };

  requestBroadcastHistory = (): void => {
    const { connectionStatus, isHost } = this.useP2PStore.getState();
    if (isHost) {
      console.error(
        "Socket P2P Manager | cannot request history because is host"
      );
      return;
    }
    // TODO: consider if this breaks an invariant; should connected always be required to be hosting?
    if (connectionStatus !== "Room") {
      console.error(
        "Socket P2P Manager | cannot request history because not connected"
      );
      return;
    }
    const event: BroadcastHistoryRequest = {
      type: "BROADCAST_HISTORY_REQUEST",
      payload: {
        requester: this.socket.id as PlayerId,
      },
    };
    this.emitEvent(event);
  };

  respondBroadcastHistory = (
    history: BroadcastT[],
    requester: PlayerId
  ): void => {
    const { connectionStatus, isHost } = this.useP2PStore.getState();
    if (!isHost) {
      console.error(
        "Socket P2P Manager | cannot respond history because is not host"
      );
      return;
    }
    // TODO: consider if this breaks an invariant; should connected always be required to be hosting?
    if (connectionStatus !== "Room") {
      console.error(
        "Socket P2P Manager | cannot respond history because not connected"
      );
      return;
    }
    const event: BroadcastHistoryResponse<BroadcastT> = {
      type: "BROADCAST_HISTORY_RESPONSE",
      payload: {
        requester,
        data: {
          history,
        },
      },
    };
    this.emitEvent(event);
  };

  broadcastToRoom = (messages: BroadcastT[]): void => {
    const { connectionStatus, isHost } = this.useP2PStore.getState();
    if (!isHost) {
      console.error(
        "Socket P2P Manager | cannot broadcast to room because not host"
      );
      return;
    }
    // TODO: consider if this breaks an invariant; should connected always be required to be hosting?
    if (connectionStatus !== "Room") {
      console.error(
        "Socket P2P Manager | cannot broadcast to room because not connected"
      );
      return;
    }
    const event: BroadcastRoomEvent<BroadcastT> = {
      type: "BROADCAST_ROOM",
      payload: {
        messages: messages,
      },
    };
    this.emitEvent(event);
  };

  emitToHost = (messages: EmitT[]): void => {
    const { connectionStatus, isHost } = this.useP2PStore.getState();
    if (connectionStatus !== "Room") {
      console.error("Socket P2P Manager | cannot emit because not connected");
    }

    const event: EmitToHostEvent<EmitT> = {
      type: "EMIT_TO_HOST",
      payload: {
        messages,
      },
    };

    // Don't relay through the server; just give self the messages!
    if (isHost) {
      this._onReceiveEmit(event);
    } else {
      this.emitEvent(event);
    }
  };

  private emitEvent = (event: OutgoingEvent<EmitT, BroadcastT>) => {
    this.socket.emit(event.type, event.payload);
  };

  private handleEvent = (event: IncomingEvent<EmitT, BroadcastT>) => {
    console.group(`Socket P2P Manager | Handle Event: ${event.type}`);
    console.log("Payload:", event.payload);

    switch (event.type) {
      case "BROADCAST_ROOM": {
        this._onReceiveBroadcast(event);
        break;
      }
      case "EMIT_TO_HOST": {
        this._onReceiveEmit(event);
        break;
      }
      case "P2P_MANAGEMENT__SERVER": {
        // These occur for both create AND join events
        switch (event.payload.type) {
          case "ROOM_JOIN_SUCCESS": {
            this.useP2PStore.setState({
              roomId: event.payload.data.roomId,
              color: event.payload.data.color,
              isHost: event.payload.data.isHost,
              connectionStatus: "Room",
            });
            if (!event.payload.data.isHost) {
              console.log(
                "Successfully joined room as non-host. Requesting game history."
              );
              this.requestBroadcastHistory();
            }
            break;
          }
          case "ROOM_JOIN_FAILURE": {
            console.error(
              `Socket P2P Manager | Room Join Failure. Reason: ${event.payload.data.failureMessage}`
            );
            this.useP2PStore.setState({
              failureMessage: event.payload.data.failureMessage,
              connectionStatus: "Lobby",
            });
            break;
          }
          case "NEW_HOST": {
            if (event.payload.data.hostId === this.socket.id) {
              console.log("Becoming Host!");
              this.useP2PStore.setState({
                isHost: true,
              });
            } else {
              console.log(`New host: ${event.payload.data.hostId}`);
            }
            break;
          }
          default: {
            const unknownPayload = event.payload as { type: unknown };
            console.error(
              `Unexpected P2P management server payload received: ${unknownPayload.type}`,
              unknownPayload
            );
            break;
          }
        }
        break;
      }

      case "BROADCAST_HISTORY_REQUEST": {
        console.log(
          `Received Broadcast History Request from ${event.payload.requester}`
        );
        this._onReceiveBroadcastHistoryRequest(event.payload.requester);
        break;
      }

      case "BROADCAST_HISTORY_RESPONSE": {
        console.log(" Received Broadcast History Response");
        this._onReceiveBroadcastHistoryResponse(event.payload.data.history);
        break;
      }

      default: {
        assertUnreachable(event);
        const unknownEvent = event as SocketEvent<string, unknown>;
        console.error(
          `Unexpected event received: ${unknownEvent.type}`,
          unknownEvent.payload
        );
      }
    }

    console.groupEnd();
  };

  requestCreateRoom = ({ color }: { color: Color }): void => {
    const { connectionStatus } = this.useP2PStore.getState();

    // TODO: should this throw instead?
    if (connectionStatus !== "Lobby") {
      console.error(
        `Cannot create a room because connection status is currently: ${connectionStatus}`
      );
      return;
    }
    const event: P2PManagementEvent_client = {
      type: "P2P_MANAGEMENT__CLIENT",
      payload: {
        type: "REQUEST_HOST",
        data: {
          color,
        },
      },
    };
    this.useP2PStore.setState({
      connectionStatus: "Joining",
    });
    this.emitEvent(event);
  };

  /**
   *
   * @param hostIfNeeded for reconnect attempts; in case the server goes down / all clients drop at same time.
   */
  requestJoinRoom = ({
    roomId,
    color,
    hostIfNeeded,
  }: {
    roomId: RoomId;
    color: Color;
    hostIfNeeded?: boolean;
  }): void => {
    const { connectionStatus } = this.useP2PStore.getState();

    // TODO: should this throw instead?
    if (connectionStatus !== "Lobby" && connectionStatus !== "Disconnected") {
      console.error(
        `Cannot join a room because connection status is currently: ${connectionStatus}`
      );
      return;
    }

    const event: P2PManagementEvent_client = {
      type: "P2P_MANAGEMENT__CLIENT",
      payload: {
        type: "REQUEST_JOIN",
        data: {
          color,
          roomId,
          hostIfNeeded,
        },
      },
    };
    // TODO: How is failure handled for this?
    this.emitEvent(event);
  };
}

export default Socket_P2PManager;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function assertUnreachable(x: never): void {
  console.error("Assert Unreachable: ", x);
}
