'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  timezone: string | null;
  daily_goal: number;
  preferred_language: string;
  theme: string;
  xp: number;
  level: number;
  streak: number;
  last_active: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile isn't found immediately (e.g. trigger is executing), retry once after a short delay
        if (error.code === 'PGRST116') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (!retry.error) {
            setProfile(retry.data as Profile);
            return;
          }
        }
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  // Gamified helper to add experience points and handle leveling
  const addXP = async (amount: number) => {
    if (!user || !profile) return;
    try {
      const newXP = profile.xp + amount;
      // Level formula: level up every 100 XP
      const newLevel = Math.floor(newXP / 100) + 1;
      const updates: Partial<Profile> = { xp: newXP, level: newLevel };

      await updateProfile(updates);

      // Trigger achievement notifications if leveled up
      if (newLevel > profile.level) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎉 Level Up!',
          content: `Congratulations! You reached Level ${newLevel}! Keep up the amazing study work.`,
        });
      }
    } catch (err) {
      console.error('Error adding XP:', err);
    }
  };

  // Daily streak calculation logic
  const updateStreak = async () => {
    if (!user || !profile) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastActive = profile.last_active;

      let newStreak = profile.streak;

      if (!lastActive) {
        // First study session ever
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActive);
        const currentDate = new Date(today);
        
        // Difference in days
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Study on consecutive days
          newStreak = profile.streak + 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
      }

      await updateProfile({
        streak: newStreak,
        last_active: today,
      });
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
        updateProfile,
        addXP,
        updateStreak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
