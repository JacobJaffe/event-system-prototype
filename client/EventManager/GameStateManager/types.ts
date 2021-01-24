import { UseStore } from "zustand";

type ErrorMessage = string;

/**
 * An abstract state machine.
 * State should only be in the StateShape IFF the state needs to be shared between clients.
 * (e.g, player position and tile placements, but not hovered objects or keybindings)
 */
export interface GameStateManager<
  Event,
  StateShape extends Record<string, unknown>
> {
  useState: UseStore<StateShape>;
  reduceEvent: (event: Event) => void | ErrorMessage;
}
