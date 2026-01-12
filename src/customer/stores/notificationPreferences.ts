import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationPreferences } from "../../types/api";
import { fetchNotificationPreferences, patchNotificationPreferences } from "../../services/notifications";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  loyalty: true,
  marketing: false,
  whatsappOrderUpdates: true,
};

type NotificationPrefState = {
  preferences: NotificationPreferences;
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
  hydratePreferences: () => Promise<void>;
  resetPreferences: () => void;
};

export const useNotificationPreferencesStore = create<NotificationPrefState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      updatePreference: (key, value) => {
        const next = { ...get().preferences, [key]: value };
        set({ preferences: next });
        void patchNotificationPreferences({ [key]: value }).then((remote) => {
          if (remote) {
            set({ preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...remote } });
          }
        });
      },
      hydratePreferences: async () => {
        const remote = await fetchNotificationPreferences();
        if (remote) {
          set({ preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...remote } });
        }
      },
      resetPreferences: () => {
        set({ preferences: DEFAULT_NOTIFICATION_PREFERENCES });
      },
    }),
    { name: "fasket-notification-prefs-v1", version: 1 }
  )
);

export function useNotificationPreferences<T>(selector: (state: NotificationPrefState) => T): T {
  return useNotificationPreferencesStore(selector);
}
