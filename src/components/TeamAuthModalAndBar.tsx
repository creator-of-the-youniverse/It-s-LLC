import React, { useState } from 'react';
import { TeamMember } from '../types';
import { googleSignIn } from '../services/googleWorkspaceAuth';
import { syncUserProfile } from '../services/firestoreSync';
import { GoogleSignInButton } from './GoogleWorkspaceHubView';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Shield,
  X,
  LogIn,
  Sparkles,
} from 'lucide-react';

const AVATAR_COLORS = [
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#ec4899', // Pink
];

const ROLE_PRESETS = [
  'Outbound Caller (9–11 AM Block)',
  '10-Min Demo Specialist',
  'Proposals & Deposit Closer',
  '5-Page Build & Automation Delivery',
  'Prospect Researcher (8–9 AM Block)',
  'Full-Stack Campaign Operator',
];

interface TeamAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  activeMember: TeamMember;
  onSelectActiveMember: (member: TeamMember) => void;
  onAddOrSignInMember: (member: TeamMember) => void;
}

export const TeamAuthModal: React.FC<TeamAuthModalProps> = ({
  isOpen,
  onClose,
  teamMembers,
  activeMember,
  onSelectActiveMember,
  onAddOrSignInMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE_PRESETS[0]);
  const [avatarColor, setAvatarColor] = useState(
    AVATAR_COLORS[teamMembers.length % AVATAR_COLORS.length]
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleManualJoinOrSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAuthError('Please enter your operator name or callsign.');
      return;
    }
    const existing = teamMembers.find(
      (m) =>
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (email.trim() && m.email.trim().toLowerCase() === email.trim().toLowerCase())
    );

    if (existing) {
      const updated: TeamMember = {
        ...existing,
        role: role || existing.role,
        lastActiveAt: new Date().toISOString(),
      };
      onAddOrSignInMember(updated);
      onClose();
      return;
    }

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: trimmedName,
      email: email.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@itsllc.team`,
      role,
      avatarColor,
      joinedAt: new Date().toISOString().slice(0, 10),
      lastActiveAt: new Date().toISOString(),
      authProvider: 'team',
    };
    onAddOrSignInMember(newMember);
    setName('');
    setEmail('');
    onClose();
  };

  const handleGoogleOperatorSignIn = async () => {
    setAuthError(null);
    setIsGoogleSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        await syncUserProfile(res.user, role).catch(() => {});
        const displayName =
          res.user.displayName || res.user.email?.split('@')[0] || 'Google Operator';
        const userEmail = res.user.email || 'operator@gmail.com';
        const existing = teamMembers.find(
          (m) =>
            m.email.toLowerCase() === userEmail.toLowerCase() ||
            m.name.toLowerCase() === displayName.toLowerCase()
        );
        const member: TeamMember = existing
          ? {
              ...existing,
              name: displayName,
              email: userEmail,
              lastActiveAt: new Date().toISOString(),
              authProvider: 'google',
            }
          : {
              id: `team-google-${Date.now()}`,
              name: displayName,
              email: userEmail,
              role,
              avatarColor,
              joinedAt: new Date().toISOString().slice(0, 10),
              lastActiveAt: new Date().toISOString(),
              authProvider: 'google',
            };
        onAddOrSignInMember(member);
        onClose();
      }
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google sign-in popup closed. You can also sign in directly with your Operator Name below.'
      );
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="team-auth-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
              <Shield className="w-4 h-4" />
              <span>MULTI-OPERATOR AUTHENTICATION &amp; SQUAD ROSTER</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Sign In or Send In a Team Member ($20,000 Shared Goal)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Any number of operators can sign in and collaborate on the same $20,000 target. One person can claim and make the outbound call, another can claim and run the 10-minute demo, another can send the proposal, and another can deliver the 5-page build.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            aria-label="Close team auth modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
            {authError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Active Squad Roster (1-Click Switch) */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Active Team Roster ({teamMembers.length} Operators)
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">
                Click to act as operator
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {teamMembers.map((member) => {
                const isCurrent = member.id === activeMember.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onSelectActiveMember(member);
                      onClose();
                    }}
                    data-testid={`switch-operator-${member.id}`}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-sky-500/15 border-sky-500/50 text-white'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shrink-0"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {member.role}
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Sign In New or Existing Team Member */}
          <div className="md:col-span-6 space-y-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign In / Add Team Operator</span>
            </h3>

            <form onSubmit={handleManualJoinOrSignIn} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Operator Name or Callsign *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Taylor Brooks or Closer #2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="team-auth-name-input"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="operator@itsllc.team"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="team-auth-email-input"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Primary Squad Role (Any Member Can Claim Any Step)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  data-testid="team-auth-role-select"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {ROLE_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Operator Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        avatarColor === col
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={`Select color ${col}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                data-testid="team-auth-submit-btn"
                className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In &amp; Join Shared Campaign</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-2 text-[10px] font-mono uppercase text-slate-500">
                OR GOOGLE WORKSPACE SSO
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <div className="flex justify-center">
              <GoogleSignInButton
                onClick={handleGoogleOperatorSignIn}
                disabled={isGoogleSigningIn}
                label={
                  isGoogleSigningIn
                    ? 'Signing in with Google...'
                    : 'Sign in with Google Account'
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TeamSidebarTriggerCard: React.FC<{
  activeMember: TeamMember;
  teamCount: number;
  onlineCount: number;
  onOpenAuthModal: () => void;
  onOpenTeamWarRoom: () => void;
}> = ({
  activeMember,
  teamCount,
  onlineCount,
  onOpenAuthModal,
  onOpenTeamWarRoom,
}) => (
  <div
    className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5"
    data-testid="sidebar-team-auth-card"
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-950 shrink-0"
          style={{ backgroundColor: activeMember.avatarColor }}
        >
          {activeMember.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate" data-testid="active-operator-name">
            {activeMember.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {activeMember.role}
          </div>
        </div>
      </div>
      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 shrink-0">
        {teamCount} Squad • {onlineCount} Live
      </span>
    </div>

    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={onOpenAuthModal}
        data-testid="open-team-auth-btn"
        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
      >
        <Users className="w-3 h-3 text-sky-400" />
        <span>Sign In / Switch</span>
      </button>
      <button
        type="button"
        onClick={onOpenTeamWarRoom}
        data-testid="open-team-war-room-btn"
        className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-[11px] font-semibold text-sky-300 flex items-center justify-center gap-1 cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span>Team Charts</span>
      </button>
    </div>
  </div>
);
