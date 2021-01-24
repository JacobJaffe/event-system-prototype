import create, { UseStore } from "zustand";

import type { PublicP2PState } from "./types";

export const createP2PStore = (): UseStore<PublicP2PState> =>
  create(() => ({
    connectionStatus: "Initial",
    isHost: false,
    roomId: undefined,
    failureMessage: undefined,
  }));
