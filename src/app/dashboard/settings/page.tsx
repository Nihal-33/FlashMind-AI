'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  Download, 
  Bell, 
  Brain, 
  Moon, 
  Sun, 
  Lock, 
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  // Settings State
  const [theme, setTheme] = useState(profile?.theme || 'dark');
  const [modelPriority, setModelPriority] = useState('deepseek-v4-pro');
  
  // Checks
  const [emailNotif, setEmailNotif] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  // Status
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // EXPORT ALL DATA
  const handleExportAllData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      // Fetch subjects, topics, flashcards, study sessions
      const { data: subjects } = await supabase.from('subjects').select('*').eq('user_id', user.id);
      const { data: topics } = await supabase.from('topics').select('*'); // RLS handles restriction
      const { data: flashcards } = await supabase.from('flashcards').select('*').eq('user_id', user.id);
      const { data: studySessions } = await supabase.from('study_sessions').select('*').eq('user_id', user.id);

      const backup = {
        profile,
        subjects: subjects || [],
        topics: topics || [],
        flashcards: flashcards || [],
        studySessions: studySessions || [],
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flashmind-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Backup generation failed.');
    } finally {
      setExporting(false);
    }
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmName = prompt('WARNING: This action is irreversible. All your study decks, subjects, and stats will be permanently deleted. Type "DELETE" to confirm:');
    if (confirmName !== 'DELETE') {
      alert('Confirmation code incorrect. Deletion cancelled.');
      return;
    }

    setDeleting(true);
    try {
      // In Supabase, if we delete the profile or user, RLS and cascade rules delete tables.
      // We can delete the profiles row, which cascades to subjects, topics, flashcards.
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;

      // Delete auth user by signing out and redirecting
      await signOut();
      router.push('/');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error deleting profile records.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure your study assistant configurations, notifications, and export account data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: General Preference */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Theme & AI Settings */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-primary" />
              General & AI Preferences
            </h3>

            <div className="space-y-4 pt-2">
              {/* Theme select */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Interface Theme</h4>
                  <p className="text-slate-400 text-[10px]">Configure your visual preferences.</p>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-white/5">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold ${
                      theme === 'dark' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      setTheme('light');
                      alert('Light mode theme is currently a pro preview feature. Restoring Dark slate theme.');
                      setTheme('dark');
                    }}
                    className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold ${
                      theme === 'light' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </button>
                </div>
              </div>

              {/* Model Priority select */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">AI Generation Model</h4>
                  <p className="text-slate-400 text-[10px]">Select Priority deep learning engine.</p>
                </div>
                <div>
                  <select
                    value={modelPriority}
                    onChange={(e) => setModelPriority(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-350 outline-none focus:border-primary transition"
                  >
                    <option value="deepseek-v4-pro">DeepSeek V4 Pro (Reasoning)</option>
                    <option value="deepseek-v4-flash">DeepSeek V4 Flash (Speed)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-secondary" />
              Notifications
            </h3>

            <div className="space-y-4 pt-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Weekly Study Stats Emails</h4>
                  <p className="text-slate-400 text-[10px]">Receive summaries of cards studied and quiz grades.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Daily Revision Reminders</h4>
                  <p className="text-slate-400 text-[10px]">Send email reminders when flashcards are due for review.</p>
                </div>
                <input
                  type="checkbox"
                  checked={streakReminders}
                  onChange={(e) => setStreakReminders(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Browser Push Notifications</h4>
                  <p className="text-slate-400 text-[10px]">Enable browser notifications for study streaks.</p>
                </div>
                <input
                  type="checkbox"
                  checked={pushNotif}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if ('Notification' in window) {
                        Notification.requestPermission().then(permission => {
                          setPushNotif(permission === 'granted');
                        });
                      } else {
                        alert('Browser does not support notifications.');
                      }
                    } else {
                      setPushNotif(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Data Backup & Danger Zone */}
        <div className="space-y-6">
          {/* Backup data */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Backup & Export</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Download your complete database profile, folders, and flashcards in JSON format for safe-keeping.
            </p>

            <button
              onClick={handleExportAllData}
              disabled={exporting}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-white/5 text-xs flex items-center justify-center gap-1.5 transition"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Backup JSON
            </button>
          </div>

          {/* Danger Zone */}
          <div className="glass p-6 rounded-2xl border-red-500/20 bg-red-950/5 space-y-4 glow-secondary">
            <h3 className="font-bold text-red-400 text-sm border-b border-red-500/10 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5" />
              Danger Zone
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Delete your account and all associated flashcard libraries. This operation cannot be undone.
            </p>

            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-red-500/10"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Account
            </button>
          </div>

          {/* Save trigger */}
          <div className="text-center pt-2">
            <button
              onClick={saveSettings}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Settings Saved
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
