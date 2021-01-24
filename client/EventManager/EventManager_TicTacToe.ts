import { EventManager } from "./types";
import type {
  Event_TicTacToe,
  StateShape_TicTacToe,
} from "./GameStateManager/GameStateManager_TicTacToe/types";
import { Color } from "shared/types";
import Socket_P2PManager from "./P2PManager";
import GameStateManager_TicTacToe from "./GameStateManager/GameStateManager_TicTacToe";

type RequestedEvent = Event_TicTacToe;
type AcceptedEvent = Event_TicTacToe & {
  isAccepted: true;
  acceptingHost: Color;
};

class EventManager_TicTacToe extends EventManager<
  RequestedEvent,
  AcceptedEvent,
  StateShape_TicTacToe
> {
  p2pManager: Socket_P2PManager<RequestedEvent, AcceptedEvent>;
  gameStateManager: GameStateManager_TicTacToe;
  constructor() {
    super();
    console.group("EventManager_TicTacToe | Constructor");
    console.log("Creating Socket P2P Manager...");
    this.p2pManager = new Socket_P2PManager();
    console.log("Creating Tic Tac Toe Game State Manager...");
    this.gameStateManager = new GameStateManager_TicTacToe();
    console.log("Connecting handlers for Socket to Game State...");
    this.connectP2PManagerWithGameStateManager();
    console.groupEnd();
  }

  _acceptMessage = (request: RequestedEvent): AcceptedEvent => {
    return Object.assign(request, {
      isAccepted: true,
      acceptingHost: this.p2pManager.useP2PStore.getState().color,
    } as {
      isAccepted: true; // This is silly that it's needed.
      acceptingHost: Color;
    });
  };
}

export default EventManager_TicTacToe;
