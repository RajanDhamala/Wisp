/* eslint-disable react-refresh/only-export-components -- Zustand stores are not React components. */
import { create } from "zustand";

export interface CurrentUser {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  provider: string;
}

interface UserStore {
  authInitialized: boolean;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser) => void;
  clearCurrentUser: () => void;
}

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

const useUserStore = create<UserStore>((set) => ({
  authInitialized: false,
  currentUser: null,
  setCurrentUser: (user) =>
    set({ authInitialized: true, currentUser: user }),
  clearCurrentUser: () =>
    set({ authInitialized: true, currentUser: null }),
}));

export default useUserStore;
