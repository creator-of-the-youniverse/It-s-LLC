import { AppNotification, NotificationPreferences } from '../types';
import { playNotificationChime } from './notificationSound';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browserNotificationsEnabled: false,
  soundEnabled: true,
  notifyOnTaskDue: true,
  notifyOnStepClaimed: true,
  notifyOnDepositCollected: true,
  notifyOnProposalExpiring: true,
  notifyOnDncAdded: true,
  notifyOnHourlyQuotaReset: true,
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function deliverNotification(
  notif: AppNotification,
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
) {
  // 1. Play executive sound chime if sound is enabled
  if (prefs.soundEnabled) {
    playNotificationChime();
  }

  // 2. Dispatch system / browser native notification if permitted
  if (
    prefs.browserNotificationsEnabled &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: notif.id,
      });
    } catch {
      // Browser notification dispatch failure handled gracefully
    }
  }
}
