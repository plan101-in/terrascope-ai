import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { storageService } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any | null;
  onAuthChange: (user: any | null) => void;
  onDataExport?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
  onDataExport,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.user) {
        setSuccessMessage('Successfully signed in to Supabase!');
        storageService.setUser(data.user.id, data.user.email);
        onAuthChange(data.user);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.session && data.user) {
        setSuccessMessage('Account created and signed in successfully!');
        storageService.setUser(data.user.id, data.user.email);
        onAuthChange(data.user);
        setTimeout(() => {
          onClose();
        }, 900);
      } else if (data.user) {
        setSuccessMessage(
          'Account created! If your project has email confirmation enabled, check your inbox to confirm your address before signing in.'
        );
        setTab('signin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await supabase.auth.signOut();
      storageService.setUser(null, null);
      onAuthChange(null);
      setSuccessMessage('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign out.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await storageService.exportAllUserData();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `terrascope_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage('Failed to export backup data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-mono font-bold text-[#1779B8] uppercase">
              SUPABASE CLOUD PERSISTENCE
            </span>
            <h3 className="text-lg font-bold text-[#102B46]">
              {currentUser ? 'Supabase Account & Backup' : 'Sign In to Cloud Backend'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Authenticated: Profile & Backup Management */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#102B46] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs text-slate-500 font-medium">Logged In User</div>
                  <div className="font-semibold text-slate-900 text-sm truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>User ID:</span>
                  <span className="font-mono text-slate-800 text-[11px] truncate max-w-[200px]">
                    {currentUser.id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Persistence Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Supabase Active (RLS)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Private Storage:</span>
                  <span className="font-mono text-slate-700">terrascope-images</span>
                </div>
              </div>
            </div>

            {/* Export Backup Section */}
            <div className="p-3.5 rounded-lg bg-[#DCEFFB]/40 border border-[#1779B8]/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#102B46]">
                <Database className="w-4 h-4 text-[#1779B8]" />
                <span>Export My Data (JSON Backup)</span>
              </div>
              <p className="text-slate-600">
                Download a consolidated JSON file of all your persisted settings, dynamic taxonomy, review events, predictions, and evaluation benchmarks.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export My Data Backup
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Session active with automatic token refresh</span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* If Unauthenticated: Sign In / Sign Up Forms */
          <div className="space-y-4">
            {/* Tab selector */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  tab === 'signin'
                    ? 'border-[#1779B8] text-[#102B46]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'border-[#1779B8] text-[#102B46]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Info notice */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1779B8] shrink-0 mt-0.5" />
              <span>
                Row-Level Security (RLS) ensures that all saved land-use classifications, uploaded images, and planner review records remain isolated to your user ID.
              </span>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="planner@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
                  />
                </div>
                {tab === 'signup' && (
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Must be at least 6 characters
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {tab === 'signin' ? 'Sign In to Supabase' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
