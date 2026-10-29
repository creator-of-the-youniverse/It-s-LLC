import React, { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { syncUserProfile } from '../services/firestoreSync';
import { Cloud, CloudCheck, LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

interface UserAuthHeaderWidgetProps {
  onUserChanged?: (user: User | null) => void;
  onOpenSquadModal?: () => void;
}

export const UserAuthHeaderWidget: React.FC<UserAuthHeaderWidgetProps> = ({
  onUserChanged,
  onOpenSquadModal,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await syncUserProfile(u).catch(() => {});
      }
      if (onUserChanged) {
        onUserChanged(u);
      }
    });
    return () => unsubscribe();
  }, [onUserChanged]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleAuthProvider);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDropdownOpen(false);
    } catch (err) {
      console.error('Sign Out error:', err);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Cloud Sync Status Indicator */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400"
        title="Connected to Google Cloud Firestore with real-time persistent memory"
      >
        <CloudCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Cloud Synced</span>
      </div>

      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-100 transition-all cursor-pointer"
            aria-label="User Account Menu"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-5 h-5 rounded-full object-cover border border-sky-400 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="max-w-[65px] sm:max-w-[100px] truncate text-slate-200">
              {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
              <div className="border-b border-slate-800 pb-2">
                <p className="font-semibold text-slate-100 truncate">{user.displayName || 'Real Operator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authenticated Firestore Session</span>
                </div>
              </div>

              {onOpenSquadModal && (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenSquadModal();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Squad &amp; Roles</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <LogIn className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{loading ? 'Signing in...' : 'Sign In with Google'}</span>
          <span className="sm:hidden">{loading ? '...' : 'Sign In'}</span>
        </button>
      )}
    </div>
  );
};
