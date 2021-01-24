import { UseStore } from "zustand";

type ErrorMessage = string;

/**
 * An abstract state machine.
 */
export interface GameStateManager<
  Event,
  StateShape extends Record<string, unknown>
> {
  allEvents: Event[];
  useState: UseStore<StateShape>;
  reduceEvent: (event: Event) => void | ErrorMessage;
}
