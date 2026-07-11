'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, 
  Flame, 
  Timer, 
  Award, 
  Layers, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  BookOpen,
  Calendar,
  Zap,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';

interface StudyStat {
  day: string;
  cards: number;
}

interface RecentActivity {
  id: string;
  start_time: string;
  cards_studied: number;
  correct_count: number;
}

export default function DashboardOverviewPage() {
  const { user, profile } = useAuth();
  
  // Data States
  const [totalCards, setTotalCards] = useState(0);
  const [dueCards, setDueCards] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<StudyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Fetch total cards count
        const { count: total, error: err1 } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!err1 && total !== null) setTotalCards(total);

        // 2. Fetch due cards count
        const { count: due, error: err2 } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lte('review_date', new Date().toISOString());

        if (!err2 && due !== null) setDueCards(due);

        // 3. Fetch subjects count
        const { count: subs, error: err3 } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!err3 && subs !== null) setSubjectsCount(subs);

        // 4. Fetch recent study sessions
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('id, start_time, cards_studied, correct_count')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false })
          .limit(4);

        if (sessions) setRecentActivities(sessions as RecentActivity[]);

        // 5. Fetch weekly study analytics
        const { data: analyticsData } = await supabase
          .from('analytics')
          .select('date, cards_studied')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7);

        // Build mock weekly chart data if no DB rows exist
        const defaultChartData: StudyStat[] = [
          { day: 'Mon', cards: 0 },
          { day: 'Tue', cards: 0 },
          { day: 'Wed', cards: 0 },
          { day: 'Thu', cards: 0 },
          { day: 'Fri', cards: 0 },
          { day: 'Sat', cards: 0 },
          { day: 'Sun', cards: 0 },
        ];

        if (analyticsData && analyticsData.length > 0) {
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          analyticsData.forEach(row => {
            const date = new Date(row.date);
            const dayName = daysOfWeek[date.getDay()];
            const matchIndex = defaultChartData.findIndex(d => d.day === dayName);
            if (matchIndex !== -1) {
              defaultChartData[matchIndex].cards += row.cards_studied || 0;
            }
          });
        }
        setChartData(defaultChartData);

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Daily target XP metrics
  const xpRequiredForNextLevel = 100;
  const currentLevelXP = (profile?.xp || 0) % 100;
  const xpPercent = Math.min(100, Math.round((currentLevelXP / xpRequiredForNextLevel) * 100));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Greetings Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Welcome back, {profile?.name || 'Scholar'}!</h1>
          <p className="text-slate-400 text-sm mt-1">Ready to crush your daily learning goals today?</p>
        </div>

        {/* Calendar visual */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-800/40 border border-white/5 px-3.5 py-2 rounded-xl">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Gamification Level Status */}
      <div className="glass p-6 rounded-3xl border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 glow-primary">
        <div className="space-y-2 flex-grow">
          <div className="flex justify-between items-center text-sm font-bold text-white">
            <span className="flex items-center gap-1">
              <Award className="h-5 w-5 text-accent" />
              Level {profile?.level || 1} Scholar
            </span>
            <span className="text-slate-400 text-xs font-semibold">{currentLevelXP} / {xpRequiredForNextLevel} XP</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Earn 5 XP for every flashcard created, and 10 XP for every quiz answer correct!
          </p>
        </div>

        <div className="flex gap-4 sm:border-l border-white/5 sm:pl-6 shrink-0">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total XP</span>
            <span className="text-2xl font-black text-white">{profile?.xp || 0}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Study Streak</span>
            <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
              <Flame className="h-6 w-6 fill-amber-500" />
              {profile?.streak || 0} Days
            </span>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Generate */}
        <Link 
          href="/dashboard/generator"
          className="glass p-6 rounded-2xl border-white/5 hover:border-primary/30 hover:scale-[1.01] transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">AI Flashcard Generator</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Instantly draft new study cards from raw lecture notes, text topics, or textbooks.</p>
          </div>
          <span className="text-xs font-bold text-primary flex items-center gap-1 mt-6 group-hover:translate-x-1 duration-200">
            Generate Now <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* Study */}
        <Link 
          href="/dashboard/study"
          className="glass p-6 rounded-2xl border-white/5 hover:border-secondary/30 hover:scale-[1.01] transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20 text-secondary">
              <Timer className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Study Spaced Repetition</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Review cards with optimal SM-2 scheduling. Practice due cards to retain information.</p>
          </div>
          <span className="text-xs font-bold text-secondary flex items-center gap-1 mt-6 group-hover:translate-x-1 duration-200">
            Review {dueCards} Cards <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* Quiz */}
        <Link 
          href="/dashboard/quiz"
          className="glass p-6 rounded-2xl border-white/5 hover:border-accent/30 hover:scale-[1.01] transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20 text-accent">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Quiz Arena</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Evaluate your subject retention by taking dynamic AI multiple-choice graded quizzes.</p>
          </div>
          <span className="text-xs font-bold text-accent flex items-center gap-1 mt-6 group-hover:translate-x-1 duration-200">
            Challenge Yourself <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      {/* Stats and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Weekly Chart */}
        <div className="lg:col-span-8 glass p-6 rounded-2xl border-white/5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-slate-350">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-white text-sm">Weekly Study Activity</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Cards Studied</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                />
                <Bar dataKey="cards" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cards > 0 ? '#4F46E5' : '#1E293B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Numbers & Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Library Size</span>
              <div className="text-2xl font-black text-white mt-1">{totalCards}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Saved cards</span>
            </div>
            <div className="glass p-4 rounded-xl border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Subjects</span>
              <div className="text-2xl font-black text-white mt-1">{subjectsCount}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Active folders</span>
            </div>
          </div>

          {/* Recent Activity lists */}
          <div className="glass p-5 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              Recent Practice Logs
            </h3>

            {recentActivities.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4">No recent study sessions logged. Start studying to log results!</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-4">
                      <p className="text-white font-bold truncate">Studied {act.cards_studied} cards</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(act.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shrink-0">
                      {act.cards_studied > 0 ? Math.round((act.correct_count / act.cards_studied) * 100) : 0}% Acc
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
