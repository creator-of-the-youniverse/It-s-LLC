import React, { useState } from 'react';
import {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  TeamMember,
} from '../types';
import { Bell, Clock, AlertTriangle, Sparkles, X, Volume2 } from 'lucide-react';
import { playNotificationChime } from '../utils/notificationSound';

export interface NotificationPresetTarget {
  category: NotificationCategory;
  title: string;
  message: string;
  targetEntityId?: string;
  targetEntityType?: string;
  targetTab?: string;
  defaultPriority?: NotificationPriority;
  suggestedDue?: string;
}

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetTarget?: NotificationPresetTarget | null;
  activeMember: TeamMember;
  onSaveNotification: (notif: AppNotification) => void;
}

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  onClose,
  presetTarget,
  activeMember,
  onSaveNotification,
}) => {
  const [title, setTitle] = useState(presetTarget?.title || '');
  const [message, setMessage] = useState(presetTarget?.message || '');
  const [category, setCategory] = useState<NotificationCategory>(
    presetTarget?.category || 'CUSTOM'
  );
  const [priority, setPriority] = useState<NotificationPriority>(
    presetTarget?.defaultPriority || 'HIGH'
  );
  const [dueDateTime, setDueDateTime] = useState(() => {
    if (presetTarget?.suggestedDue) return presetTarget.suggestedDue;
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });

  React.useEffect(() => {
    if (presetTarget) {
      setTitle(presetTarget.title);
      setMessage(presetTarget.message);
      setCategory(presetTarget.category);
      if (presetTarget.defaultPriority) {
        setPriority(presetTarget.defaultPriority);
      }
      if (presetTarget.suggestedDue) {
        setDueDateTime(presetTarget.suggestedDue);
      }
    }
  }, [presetTarget]);

  if (!isOpen) return null;

  const handleApplyPresetTime = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setDueDateTime(target.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      scheduledFor: dueDateTime,
      category,
      priority,
      isRead: false,
      isTriggered: false,
      targetEntityId: presetTarget?.targetEntityId,
      targetEntityType: presetTarget?.targetEntityType || category,
      targetTab: presetTarget?.targetTab || 'command',
      createdByMemberId: activeMember.id,
      createdByName: activeMember.name,
    };

    onSaveNotification(newNotif);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="create-notification-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Apply Custom Reminder / Notification
              </h2>
              <p className="text-[11px] text-slate-400">
                Attach an automated notification to this step, contact, or deadline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-semibold">
              Notification Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call Elena Rostova direct line at 1:30 PM"
              data-testid="notif-title-input"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1 font-semibold">
              Notification Details &amp; Action Notes *
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Specify the action needed, prospect details, or rule to follow..."
              data-testid="notif-message-input"
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 leading-relaxed focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                data-testid="notif-category-select"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="TASK">Task &amp; Time Block</option>
                <option value="PROSPECT">Prospect &amp; Pipeline</option>
                <option value="CALL">Call &amp; 10-Min Demo</option>
                <option value="PROPOSAL">Proposal &amp; Deposit</option>
                <option value="DELIVERY">Delivery Milestone</option>
                <option value="FINANCIAL">Cash &amp; Reserve Check</option>
                <option value="TEAM">Team War Room &amp; Relay</option>
                <option value="WSP">WhichShittyPitch Sidecar</option>
                <option value="CUSTOM">Custom Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                data-testid="notif-priority-select"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="URGENT">🔴 URGENT (Immediate Action)</option>
                <option value="HIGH">🟡 HIGH (Key Daily Milestone)</option>
                <option value="MEDIUM">🔵 MEDIUM (Standard Follow-up)</option>
                <option value="LOW">⚪ LOW (Informational / Background)</option>
              </select>
            </div>
          </div>

          {/* Quick Due Time Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Scheduled Due Time *</span>
              </label>
              <button
                type="button"
                onClick={() => playNotificationChime(priority)}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                title="Test audio chime"
              >
                <Volume2 className="w-3 h-3" />
                <span>Test Sound</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPresetTime(15)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
              >
                +15 Min
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetTime(60)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetTime(240)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
              >
                +4 Hours
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  setDueDateTime(tomorrow.toISOString().slice(0, 16));
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
              >
                Tomorrow 9:00 AM
              </button>
            </div>

            <input
              type="datetime-local"
              required
              value={dueDateTime}
              onChange={(e) => setDueDateTime(e.target.value)}
              data-testid="notif-datetime-input"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-notification-btn"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Save &amp; Set Notification</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
