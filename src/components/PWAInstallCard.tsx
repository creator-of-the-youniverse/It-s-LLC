import React, { useState } from 'react';
import {
  PWA_QUICK_SELECT_SHORTCUTS,
  QuickSelectShortcut,
  useOnlineStatus,
  usePWAInstall,
} from '../hooks/usePWAInstall';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Layers,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';

interface PWAInstallCardProps {
  onSelectShortcut: (targetTab: string) => void;
  compact?: boolean;
}

export const PWAInstallCard: React.FC<PWAInstallCardProps> = ({
  onSelectShortcut,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, swReady, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleInstallClick = async () => {
    const outcome = await install();
    if (outcome === 'manual-guide') {
      setShowGuideModal(true);
    }
  };

  const handleCopyDeepLink = async (shortcut: QuickSelectShortcut) => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${shortcut.url}`
        : shortcut.url;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(shortcut.id);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setCopiedUrl(shortcut.id);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  if (compact) {
    return (
      <div
        data-testid="pwa-sidebar-install-card"
        className="embossed-card p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/icon.svg"
              alt="App Icon"
              referrerPolicy="no-referrer"
              onContextMenu={(e) => {
                e.preventDefault();
                setShowQuickMenu((prev) => !prev);
              }}
              className="w-7 h-7 rounded-lg border border-slate-700 cursor-context-menu shrink-0"
              title="Right-click for Home Screen Quick-Select Menu"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100 truncate">
                {isInstalled ? 'Installed PWA Active' : 'Install Command OS'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {swReady ? 'Offline Cache Ready' : 'Standalone + Quick Menu'}
              </p>
            </div>
          </div>
          {!isInstalled && (
            <button
              type="button"
              data-testid="pwa-sidebar-install-btn"
              onClick={handleInstallClick}
              className="embossed-button px-2.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap shrink-0"
            >
              Install
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="pwa-sidebar-quick-menu-btn"
          onClick={() => setShowQuickMenu((prev) => !prev)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowQuickMenu((prev) => !prev);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-sky-300 bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 rounded-lg transition-colors"
        >
          <span>App Icon Quick-Select Menu</span>
          <span className="font-mono text-[10px] text-slate-400">Right-Click / Open</span>
        </button>

        {showQuickMenu && (
          <div
            data-testid="pwa-quick-select-menu-sidebar"
            className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1 animate-copy-pop"
          >
            {PWA_QUICK_SELECT_SHORTCUTS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  onSelectShortcut(sc.targetTab);
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800/80 hover:text-sky-300 rounded-md transition-colors"
              >
                <span className="truncate">{sc.shortName}</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{sc.badge}</span>
              </button>
            ))}
          </div>
        )}

        {showGuideModal && (
          <PWAInstallGuideModal
            isIOS={isIOS}
            onClose={() => setShowGuideModal(false)}
            onSelectShortcut={onSelectShortcut}
          />
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="pwa-install-card"
      className="embossed-card p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <button
            type="button"
            data-testid="pwa-app-icon-trigger"
            onClick={() => setShowQuickMenu((prev) => !prev)}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowQuickMenu(true);
            }}
            className="group relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 hover:border-sky-400 p-1.5 flex items-center justify-center shrink-0 shadow-lg transition-all cursor-context-menu"
            title="Right-click or click to open Home Screen App Icon Quick-Select Menu"
          >
            <img
              src="/icon.svg"
              alt="$5K to $20K OS App Icon"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-lg"
            />
          </button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-sky-400">
              <span>PROGRESSIVE WEB APP (PWA)</span>
              <span aria-hidden="true">·</span>
              <span>
                {isInstalled
                  ? 'Standalone App Installed'
                  : isInstallable
                  ? 'Ready for 1-Click Install'
                  : 'Installable Desktop & Mobile OS'}
              </span>
              <span aria-hidden="true">·</span>
              <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                {isOnline ? 'Online & Cached' : 'Offline Mode Active'}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-100">
              <span className="animated-copy-shimmer">
                Install $5K→$20K Command OS &amp; Home Screen Quick-Select Launcher
              </span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Install this command center to your desktop dock or mobile home screen for zero-chrome standalone execution, offline Workbox caching, and{' '}
              <strong className="text-slate-100">
                right-click / long-press Home Screen App Icon Quick-Select shortcuts
              </strong>{' '}
              into Today&apos;s Mission, Call Logging, $1,500 Proposals, and 30-Day Analytics.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="pwa-quick-select-toggle-btn"
            onClick={() => setShowQuickMenu((prev) => !prev)}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowQuickMenu(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-sky-300 bg-slate-950 border border-slate-700 hover:border-sky-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {showQuickMenu ? 'Hide Quick-Select Menu' : 'Right-Click Icon Quick Menu (6)'}
            </span>
          </button>

          {!isInstalled && (
            <button
              type="button"
              data-testid="pwa-install-primary-btn"
              onClick={handleInstallClick}
              className="embossed-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'Install on iOS Home Screen' : 'Install App to Home Screen'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Immersive Home Screen App Icon Right-Click Quick-Select Menu */}
      {showQuickMenu && (
        <div
          data-testid="pwa-quick-select-menu"
          className="pt-3 border-t border-slate-800/90 space-y-3 animate-copy-pop"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              Home Screen App Icon Quick-Select Menu (Manifest Shortcuts + Instant Deep Links)
            </span>
            <span className="font-mono text-slate-400">
              Right-click installed home screen / dock icon or launch below
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PWA_QUICK_SELECT_SHORTCUTS.map((shortcut) => {
              const isCopied = copiedUrl === shortcut.id;
              return (
                <div
                  key={shortcut.id}
                  data-testid={`quick-shortcut-${shortcut.targetTab}`}
                  className="group p-3 bg-slate-950/90 border border-slate-800 hover:border-sky-500/50 rounded-xl flex flex-col justify-between gap-2.5 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                        {shortcut.name}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                        {shortcut.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {shortcut.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectShortcut(shortcut.targetTab)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <span>Launch Workspace</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyDeepLink(shortcut)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors"
                      title="Copy deep-link shortcut URL"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 animate-copy-pop">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showGuideModal && (
        <PWAInstallGuideModal
          isIOS={isIOS}
          onClose={() => setShowGuideModal(false)}
          onSelectShortcut={onSelectShortcut}
        />
      )}
    </div>
  );
};

interface PWAInstallGuideModalProps {
  isIOS: boolean;
  onClose: () => void;
  onSelectShortcut: (targetTab: string) => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isIOS,
  onClose,
  onSelectShortcut,
}) => {
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const handleCopyUrl = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : '/';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAppUrl(true);
      setTimeout(() => setCopiedAppUrl(false), 2000);
    } catch {
      setCopiedAppUrl(true);
      setTimeout(() => setCopiedAppUrl(false), 2000);
    }
  };

  return (
    <div
      data-testid="pwa-install-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div className="embossed-card w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="PWA Icon"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl border border-slate-700"
            />
            <div>
              <p className="text-xs font-mono text-sky-400">STANDALONE PWA INSTALLATION</p>
              <h3 className="text-lg font-bold text-slate-100">
                Install $5K→$20K OS to Home Screen / Dock
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>iOS Safari Home Screen Installation:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Tap the <strong>Share</strong> button in the Safari toolbar.
              </li>
              <li>
                Scroll down and select <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Long-press the installed home screen icon at any time to open the{' '}
                <strong>6 Quick-Select Shortcuts</strong>.
              </li>
            </ol>
          </div>
        ) : (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Desktop &amp; Android Chrome / Edge Installation:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Open this app in a top-level browser tab and click the{' '}
                <strong>Install $5K→$20K OS</strong> icon in the address bar (or browser menu &rarr;{' '}
                <em>Install App</em>).
              </li>
              <li>
                Once installed on your Desktop Dock, Taskbar, or Home Screen,{' '}
                <strong>right-click (or long-press) the app icon</strong> to launch any of the 6 Web App Manifest shortcuts directly.
              </li>
            </ol>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-200">
            Active Home Screen Right-Click Shortcuts:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PWA_QUICK_SELECT_SHORTCUTS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  onSelectShortcut(sc.targetTab);
                  onClose();
                }}
                className="flex items-center justify-between px-3 py-2 text-xs text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-left"
              >
                <span className="truncate font-medium">{sc.shortName}</span>
                <span className="font-mono text-[10px] text-sky-400 shrink-0">{sc.badge}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {copiedAppUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 animate-copy-pop">Copied App URL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy App Launch URL</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-testid="pwa-offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Local Campaign Cache Active</span>
    </div>
  );
};
