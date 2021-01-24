import { Color } from "shared/types";
import type { RequestedGameEvent } from "../../types";

//
// EVENT DEFINITIONS:
//

export type Coordinate = { x: number; y: number };

type PlacePieceEvent = RequestedGameEvent<
  "PLACE_PIECE",
  { location: Coordinate; color: Color }
>;

type RemovePieceEvent = RequestedGameEvent<
  "REMOVE_PIECE",
  { location: Coordinate }
>;

// Very complex game interactions!
export type Event_TicTacToe = PlacePieceEvent | RemovePieceEvent;

//
// STORE SHAPE DEFINITION:
//

export type StateShape_TicTacToe = {
  numRows: number;
  numCols: number;
  tiles: (Color | "empty")[][];
};
