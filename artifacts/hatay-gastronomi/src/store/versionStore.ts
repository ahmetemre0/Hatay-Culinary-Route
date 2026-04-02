import { create } from "zustand";

type VersionState = {
  version: "stable" | "dev";
  setVersion: (v: "stable" | "dev") => void;
};

export const useVersionStore = create<VersionState>((set) => ({
  version: "stable",
  setVersion: (version) => set({ version }),
}));
