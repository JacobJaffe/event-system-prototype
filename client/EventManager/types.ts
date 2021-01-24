import { P2PManager } from "./P2PManager/types";
import { GameStateManager } from "./GameStateManager/types";
import { PlayerId } from "shared/types";

export abstract class EventManager<
  RequestedEventType,
  // It is important that the verification extends the the request so that either can be used in the store reducer.
  // Besides that, these events can theoretically be anything! It's up to the implementation to make the events they want.
  AcceptedEventType extends RequestedEventType,
  StateShape extends Record<string, unknown>
> {
  abstract p2pManager: P2PManager<RequestedEventType, AcceptedEventType>;
  abstract gameStateManager: GameStateManager<RequestedEventType, StateShape>;
  private AcceptedEventList: AcceptedEventType[] = [];

  /**
   * As the host, if reducing an event succeeds, accept it!
   */
  abstract _acceptMessage: (event: RequestedEventType) => AcceptedEventType;
  private _onReceiveBroadcast = (events: AcceptedEventType[]) => {
    events.forEach((e) => {
      const error = this.gameStateManager.reduceEvent(e);
      // Invariants broken. This is BAD, because this means a client is unable to reduce an event the host WAS.
      // (All of these events have been accepted)
      // TODO: Request state head from host.
      if (error) {
        console.error(
          `EventManager | Error Reducing a message from broadcast: ${error}`,
          e
        );
      } else {
        this.AcceptedEventList.push(e);
      }
    });
  };

  private _onReceiveEmit = (events: RequestedEventType[]) => {
    const { isHost } = this.p2pManager.useP2PStore.getState();
    // Can maybe happen on host switches / disconnects while events are still being processed?
    // This results in dropped events, which is fine.
    if (!isHost) {
      console.error(
        "EventManager | Cannot receive an emit, because not the host"
      );
      return;
    }

    const accepted: AcceptedEventType[] = [];
    events.forEach((e) => {
      const error = this.gameStateManager.reduceEvent(e);
      if (error) {
        console.log(`Not accepting event. Message: ${error}`, e);
      } else {
        console.log("Accepting Message: ", e);
        accepted.push(this._acceptMessage(e));
      }
    });
    if (accepted.length > 0) {
      this.AcceptedEventList.push(...accepted);
      this.p2pManager.broadcastToRoom(accepted);
    }
    console.log("New Accepted Events: ", this.AcceptedEventList, accepted);
  };

  private _onReceiveBroadcastHistoryRequest = (requester: PlayerId) => {
    this.p2pManager.respondBroadcastHistory(this.AcceptedEventList, requester);
  };

  private _onReceiveBroadcastHistoryResponse = (
    messages: AcceptedEventType[]
  ) => {
    if (this.AcceptedEventList.length !== 0) {
      console.error(
        "EventManager| Error: Can only recieve broadcast history response if no current accepted events"
      );
    }
    this._onReceiveBroadcast(messages);
  };

  /**
   * This should be called in the constructor of the implementing class.
   * This requires the P2PManager and GameStateManager to be set up,
   * so this can't be a super method.
   */
  connectP2PManagerWithGameStateManager = (): void => {
    this.p2pManager.initHandlers({
      onReceiveBroadcast: this._onReceiveBroadcast,
      onReceiveEmit: this._onReceiveEmit,
      onReceiveBroadcastHistoryRequest: this._onReceiveBroadcastHistoryRequest,
      onReceiveBroadcastHistoryResponse: this
        ._onReceiveBroadcastHistoryResponse,
    });
  };
}
export interface RequestedGameEvent<T extends string, U> {
  type: T;
  data: U;
}

type AcceptedGameEventId = string & { isVerifiedGameEventId: true };

/**
 * Adds the 'id' field to a game event, which is signed by the host who accepted the event.
 */
export interface AcceptedGameEvent<T extends string, U>
  extends RequestedGameEvent<T, U> {
  id: AcceptedGameEventId;
}
