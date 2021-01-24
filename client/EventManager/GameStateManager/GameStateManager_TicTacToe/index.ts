import type { GameStateManager } from "../types";
import { Event_TicTacToe, StateShape_TicTacToe, Coordinate } from "./types";

import create, { UseStore } from "zustand";
import produce from "immer";

// Extended type so that internally we can use the zustand set.
// Consumer doesn't need to know about that!
type _StateShape_TicTacToe = StateShape_TicTacToe & {
  set: (edit: (state: StateShape_TicTacToe) => void) => void;
};

class GameStateManager_TicTacToe
  implements GameStateManager<Event_TicTacToe, StateShape_TicTacToe> {
  useState: UseStore<_StateShape_TicTacToe>;

  constructor() {
    console.group("GameStateManager_TicTacToe | Constructor");
    console.log("Creating Store...");
    this.useState = create<_StateShape_TicTacToe>((set) => ({
      numCols: 3,
      numRows: 3,
      tiles: [
        ["empty", "empty", "empty"],
        ["empty", "empty", "empty"],
        ["empty", "empty", "empty"],
      ],
      set: (fn) => set(produce(fn)),
    }));

    console.groupEnd();
  }

  private validateCoordinate = ({ x, y }: Coordinate) => {
    const { numRows, numCols } = this.useState.getState();
    if (x < 0 || x > numRows || y < 0 || y > numCols) {
      return `Invalidate coordinates ${x}, ${y} for: Num Rows: ${numRows} | Num Cols: ${numCols}`;
    }
    return;
  };

  reduceEvent = (event: Event_TicTacToe): void | string => {
    switch (event.type) {
      case "PLACE_PIECE": {
        const {
          color,
          location: { x, y },
        } = event.data;
        const validationError = this.validateCoordinate({ x, y });
        if (validationError) return validationError;
        if (this.useState.getState().tiles[y][x] === color) {
          return `Tile is already color: ${color}`;
        }
        this.useState.getState().set((state) => {
          state.tiles[y][x] = color;
        });
        return;
      }
      case "REMOVE_PIECE": {
        const {
          location: { x, y },
        } = event.data;
        const validationError = this.validateCoordinate({ x, y });
        if (validationError) return validationError;
        if (this.useState.getState().tiles[y][x] === "empty") {
          return `Tile is already empty`;
        }

        this.useState.getState().set((state) => {
          state.tiles[y][x] = "empty";
        });
        return;
      }
      default: {
        const unknownType = ((event as unknown) as { type: unknown }).type;
        return `Unhandled Event: ${unknownType}`;
      }
    }
  };
}

export default GameStateManager_TicTacToe;
