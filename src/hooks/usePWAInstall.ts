import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface QuickSelectShortcut {
  id: string;
  name: string;
  shortName: string;
  description: string;
  targetTab: string;
  url: string;
  badge: string;
}

export const PWA_QUICK_SELECT_SHORTCUTS: QuickSelectShortcut[] = [
  {
    id: 'shortcut-mission',
    name: "Today's Mission & 8–10h Schedule",
    shortName: "Today's Mission",
    description: "Open today's priority checklist and 8:00 AM–5:30 PM execution blocks",
    targetTab: 'mission',
    url: '/?tab=mission&autostart=1',
    badge: '8:00–5:30',
  },
  {
    id: 'shortcut-calls',
    name: 'Log Outbound Call / 10-Min Demo',
    shortName: 'Log Call / Demo',
    description: 'Record a targeted outbound call, decision-maker conversation, or booked demo',
    targetTab: 'calls',
    url: '/?tab=calls&autostart=1',
    badge: '20–25/day',
  },
  {
    id: 'shortcut-proposals',
    name: 'Create $1,500 Proposal & Collect 50% Deposit',
    shortName: 'Proposals & Deals',
    description: 'Build a fixed-scope proposal or record a cleared $750 upfront deposit',
    targetTab: 'proposals',
    url: '/?tab=proposals&autostart=1',
    badge: '$1,500 Scope',
  },
  {
    id: 'shortcut-analytics',
    name: '30-Day Revenue Trajectory & Analytics',
    shortName: 'Analytics',
    description: 'View Revenue Collected vs. $20,000 Target Trajectory and pipeline math',
    targetTab: 'analytics',
    url: '/?tab=analytics&autostart=1',
    badge: '$20k Goal',
  },
  {
    id: 'shortcut-cash',
    name: 'Cash, $2,500 Reserve & Capital Ledger',
    shortName: 'Cash & Reserve',
    description: 'Inspect available business cash, protected reserve, and checkpoint gates',
    targetTab: 'cash',
    url: '/?tab=cash&autostart=1',
    badge: '$2.5k Reserve',
  },
  {
    id: 'shortcut-command',
    name: 'Executive Command Center',
    shortName: 'Command Center',
    description: 'Launch the 5-Question Executive Command Center and Next Best Action engine',
    targetTab: 'command',
    url: '/?tab=command&autostart=1',
    badge: '5 Questions',
  },
];

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'manual-guide'> => {
    if (!deferredPrompt) {
      return 'manual-guide';
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return 'accepted';
    }
    return 'dismissed';
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    swReady,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
