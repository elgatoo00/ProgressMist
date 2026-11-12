import { create } from 'zustand';

/** État d'interface non persisté (palette de commandes, aide des raccourcis, panneaux). */
interface UiStore {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  notificationsOpen: boolean;
  mobileNavOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  setNotificationsOpen: (v: boolean) => void;
  setMobileNavOpen: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  paletteOpen: false,
  shortcutsOpen: false,
  notificationsOpen: false,
  mobileNavOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
