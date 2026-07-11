'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  User as UserIcon, 
  Mail, 
  MapPin, 
  Award, 
  Target, 
  Globe, 
  Loader2, 
  Upload, 
  Check, 
  Camera,
  BookOpen,
  Calendar,
  Flame
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  
  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('GMT+5:30');
  const [dailyGoal, setDailyGoal] = useState(10);
  const [language, setLanguage] = useState('English');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Sync profile details to form inputs
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setTimezone(profile.timezone || 'GMT+5:30');
      setDailyGoal(profile.daily_goal || 10);
      setLanguage(profile.preferred_language || 'English');
    }
  }, [profile]);

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update avatar path in profiles table
      await updateProfile({ avatar: filePath });
      
      setStatusMsg({ type: 'success', text: 'Profile picture updated successfully!' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Avatar upload failed.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Submit profile details changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      await updateProfile({
        name,
        bio,
        timezone,
        daily_goal: Number(dailyGoal),
        preferred_language: language,
      });

      setStatusMsg({ type: 'success', text: 'Profile details saved successfully!' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Saving profile failed.' });
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (profile?.avatar) {
      if (profile.avatar.startsWith('http')) {
        return profile.avatar;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar);
      return data.publicUrl;
    }
    return '';
  };

  const achievements = [
    { title: 'Spaced Novice', desc: 'Reviewed your first flashcard', unlocked: (profile?.xp || 0) >= 10 },
    { title: 'Quiz Whiz', desc: 'Aced a quiz session with 80%+', unlocked: (profile?.xp || 0) >= 50 },
    { title: 'Level 5 Scholar', desc: 'Reached study Level 5', unlocked: (profile?.level || 1) >= 5 },
    { title: 'Streak Builder', desc: 'Maintained a 3-day streak', unlocked: (profile?.streak || 0) >= 3 }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Your Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your educational profile details, daily study goals, and view earned milestones.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Avatar & Milestones */}
        <div className="space-y-6 lg:col-span-1">
          {/* Avatar Card */}
          <div className="glass p-6 rounded-2xl border-white/5 text-center space-y-4">
            <div className="relative inline-block mx-auto group">
              <div className="h-28 w-28 rounded-full bg-slate-800 border-2 border-primary flex items-center justify-center text-4xl font-extrabold text-primary uppercase overflow-hidden shadow-lg shadow-primary/10">
                {getAvatarUrl() ? (
                  <img src={getAvatarUrl()} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  profile?.name?.[0] || 'S'
                )}
              </div>
              
              {/* File upload trigger overlay */}
              <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary hover:bg-primary-hover border border-slate-900 flex items-center justify-center cursor-pointer shadow transition hover:scale-105 active:scale-95">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                {uploadingAvatar ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                ) : (
                  <Camera className="h-4.5 w-4.5 text-white" />
                )}
              </label>
            </div>

            <div>
              <h3 className="font-extrabold text-white text-base leading-snug">{profile?.name || 'Scholar Student'}</h3>
              <p className="text-slate-400 text-xs mt-1">{profile?.email}</p>
            </div>

            {/* Streak & XP Display */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-3 border-t border-white/5 text-slate-400">
              <div className="bg-slate-950/20 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-500 block uppercase">Level</span>
                <span className="text-white text-sm">Lvl {profile?.level || 1}</span>
              </div>
              <div className="bg-slate-950/20 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-500 block uppercase">Streak</span>
                <span className="text-amber-500 text-sm flex items-center justify-center gap-0.5">
                  <Flame className="h-4 w-4 fill-current" />
                  {profile?.streak || 0}d
                </span>
              </div>
            </div>
          </div>

          {/* Achievements Card */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Academic Milestones</h3>
            <div className="space-y-3.5">
              {achievements.map((ach, idx) => (
                <div key={idx} className={`flex items-center gap-3.5 ${ach.unlocked ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    ach.unlocked 
                      ? 'bg-accent/10 border-accent/20 text-accent' 
                      : 'bg-slate-800 border-white/5 text-slate-600'
                  }`}>
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs leading-none">{ach.title}</h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-none">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form details */}
        <div className="lg:col-span-2 glass p-6 md:p-8 rounded-2xl border-white/5">
          <h3 className="font-bold text-white text-md border-b border-white/5 pb-2 mb-6">Profile Settings</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {statusMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-semibold border flex gap-2 ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                  : 'bg-red-950/20 border-red-500/20 text-red-300'
              }`}>
                {statusMsg.type === 'success' ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Timezone</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <MapPin className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Daily goal (Cards count) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Daily Goal (Cards)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Target className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Preferred Language</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Globe className="h-4.5 w-4.5" />
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-slate-350 outline-none focus:border-primary transition"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Profile Biography</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief intro about your academic focus or study goals..."
                rows={4}
                className="w-full p-4 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-primary transition resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
