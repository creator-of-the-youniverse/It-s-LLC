import React, { useState } from 'react';
import {
  AppNotification,
  NotificationCategory,
  NotificationPreferences,
  TeamMember,
} from '../types';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Volume2,
  VolumeX,
  Plus,
  ArrowRight,
  Filter,
  Shield,
  Clock,
  Sparkles,
  Settings,
  PhoneCall,
  Calendar,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
} from 'lucide-react';
import { playNotificationChime } from '../utils/notificationSound';
import { requestBrowserPermission } from '../utils/notifications';

interface NotificationCenterProps {
  notifications: AppNotification[];
  preferences: NotificationPreferences;
  onUpdateNotifications: (next: AppNotification[]) => void;
  onUpdatePreferences: (next: NotificationPreferences) => void;
  onNavigateTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  activeMember: TeamMember;
}

const CATEGORY_ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  TASK: Clock,
  PROSPECT: Users,
  CALL: PhoneCall,
  PROPOSAL: FileText,
  DELIVERY: Calendar,
  FINANCIAL: DollarSign,
  TEAM: Sparkles,
  WSP: Shield,
  CUSTOM: Bell,
};

const PRIORITY_BADGES: Record<string, { bg: string; text: string; dot: string }> = {
  URGENT: { bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-300', dot: 'bg-rose-400' },
  HIGH: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  MEDIUM: { bg: 'bg-sky-500/20 border-sky-500/40', text: 'text-sky-300', dot: 'bg-sky-400' },
  LOW: { bg: 'bg-slate-700/40 border-slate-600', text: 'text-slate-300', dot: 'bg-slate-400' },
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  preferences,
  onUpdateNotifications,
  onUpdatePreferences,
  onNavigateTab,
  onOpenCreateModal,
  activeMember,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'TASKS' | 'PIPELINE' | 'FINANCIAL'>('ALL');
  const [showPreferences, setShowPreferences] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.isRead;
    if (activeFilter === 'TASKS') return n.category === 'TASK';
    if (activeFilter === 'PIPELINE') return n.category === 'PROSPECT' || n.category === 'CALL' || n.category === 'WSP';
    if (activeFilter === 'FINANCIAL') return n.category === 'FINANCIAL' || n.category === 'PROPOSAL' || n.category === 'DELIVERY';
    return true;
  });

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    onUpdateNotifications(updated);
  };

  const handleToggleRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, isRead: !n.isRead } : n
    );
    onUpdateNotifications(updated);
  };

  const handleDismissNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    onUpdateNotifications(updated);
  };

  const handleToggleSound = () => {
    const nextVal = !preferences.soundEnabled;
    onUpdatePreferences({ ...preferences, soundEnabled: nextVal });
    if (nextVal) {
      playNotificationChime();
    }
  };

  const handleEnableBrowserPush = async () => {
    const granted = await requestBrowserPermission();
    onUpdatePreferences({
      ...preferences,
      browserNotificationsEnabled: granted,
    });
  };

  return (
    <div className="relative">
      {/* Top Header Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-bell-btn"
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-slate-200 transition-colors cursor-pointer"
        aria-label="Open notifications center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-slate-950 shadow-md animate-pulse shrink-0"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Down / Popover Notification Center */}
      {isOpen && (
        <div
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-12 z-50 sm:w-96 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-4 space-y-3.5 max-h-[85vh] flex flex-col"
          data-testid="notification-center-drawer"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Notification Center
              </h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 font-semibold">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSound}
                className="p-1 rounded text-slate-400 hover:text-white"
                title={preferences.soundEnabled ? 'Mute Chimes' : 'Enable Sound Chimes'}
              >
                {preferences.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Notification Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preferences Sub-Panel (collapsible) */}
          {showPreferences && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] font-mono text-sky-400">
                <span>Notification Preferences</span>
                <button
                  type="button"
                  onClick={handleEnableBrowserPush}
                  className="text-emerald-400 hover:underline"
                >
                  {preferences.browserNotificationsEnabled ? '✓ Push Allowed' : 'Enable Push'}
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={handleToggleSound}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>Play audio chimes on alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnTaskDue}
                    onChange={(e) =>
                      onUpdatePreferences({ ...preferences, notifyOnTaskDue: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>Alert on daily checklist time blocks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnStepClaimed}
                    onChange={(e) =>
                      onUpdatePreferences({ ...preferences, notifyOnStepClaimed: e.target.checked })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>Alert when teammate claims a step</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnDepositCollected}
                    onChange={(e) =>
                      onUpdatePreferences({
                        ...preferences,
                        notifyOnDepositCollected: e.target.checked,
                      })
                    }
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>Alert when cash deposit is collected</span>
                </label>
              </div>
            </div>
          )}

          {/* Quick Filter Buttons & Create Notification Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('UNREAD')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeFilter === 'UNREAD'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('TASKS')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeFilter === 'TASKS'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('PIPELINE')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeFilter === 'PIPELINE'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Pipeline
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenCreateModal();
                setIsOpen(false);
              }}
              data-testid="open-create-notification-btn"
              className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Apply Reminder</span>
            </button>
          </div>

          {/* Notification List Scroll Area */}
          <div className="space-y-2 overflow-y-auto max-h-72 pr-1 flex-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <Bell className="w-6 h-6 text-slate-600 mx-auto" />
                <p>No notifications match this view.</p>
                <p className="text-[11px] text-slate-500">
                  Click &quot;Apply Reminder&quot; or the bell on any task/card to schedule one.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const Icon = CATEGORY_ICONS[notif.category] || Bell;
                const badge = PRIORITY_BADGES[notif.priority] || PRIORITY_BADGES.MEDIUM;
                return (
                  <div
                    key={notif.id}
                    data-testid={`notif-item-${notif.id}`}
                    className={`p-3 rounded-xl border space-y-1.5 transition-all text-xs ${
                      notif.isRead
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                        : 'bg-slate-950 border-sky-500/40 text-white shadow-sm ring-1 ring-sky-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`}
                        />
                        <Icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-bold truncate text-[11px]">{notif.title}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${badge.bg} ${badge.text} shrink-0`}
                      >
                        {notif.priority}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">{notif.message}</p>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <span>{notif.scheduledFor ? `Due: ${notif.scheduledFor}` : 'Instant'}</span>

                      <div className="flex items-center gap-1.5">
                        {notif.targetTab && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab(notif.targetTab!);
                              setIsOpen(false);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleRead(notif.id)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title={notif.isRead ? 'Mark as Unread' : 'Mark as Read'}
                        >
                          <Check className={`w-3 h-3 ${notif.isRead ? 'text-slate-500' : 'text-sky-400'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDismissNotification(notif.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                          title="Dismiss notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="hover:text-sky-400 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark All Read</span>
              </button>
              <span>{activeMember.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
