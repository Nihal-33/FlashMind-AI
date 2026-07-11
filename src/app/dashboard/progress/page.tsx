'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  BarChart2, 
  Flame, 
  Award, 
  Hourglass, 
  CheckCircle, 
  BookOpen, 
  Loader2,
  TrendingUp,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

interface MasteryDistribution {
  name: string;
  value: number;
}

interface WeeklyStudyTime {
  day: string;
  minutes: number;
}

interface SubjectAccuracy {
  subject: string;
  accuracy: number;
}

export default function ProgressPage() {
  const { user, profile } = useAuth();
  
  // Analytics States
  const [masteryData, setMasteryData] = useState<MasteryDistribution[]>([]);
  const [weeklyTime, setWeeklyTime] = useState<WeeklyStudyTime[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectAccuracy[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Fetch Mastery Level Distribution
        const { data: cards, error: err1 } = await supabase
          .from('flashcards')
          .select('mastery_level')
          .eq('user_id', user.id);

        if (!err1 && cards) {
          const distribution = [
            { name: 'Stage 0 (New)', value: 0 },
            { name: 'Stage 1 (Learning)', value: 0 },
            { name: 'Stage 2 (Familiar)', value: 0 },
            { name: 'Stage 3 (Mastered)', value: 0 },
          ];

          cards.forEach(c => {
            const level = c.mastery_level || 0;
            if (level === 0) distribution[0].value++;
            else if (level === 1) distribution[1].value++;
            else if (level === 2) distribution[2].value++;
            else distribution[3].value++;
          });

          // Filter out slices with 0 value to make the pie chart clean
          setMasteryData(distribution.filter(d => d.value > 0));
        }

        // 2. Fetch Weekly Study Times (last 7 days from analytics)
        const { data: dailyLogs } = await supabase
          .from('analytics')
          .select('date, study_time')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7);

        const defaultTimeData: WeeklyStudyTime[] = [
          { day: 'Mon', minutes: 0 },
          { day: 'Tue', minutes: 0 },
          { day: 'Wed', minutes: 0 },
          { day: 'Thu', minutes: 0 },
          { day: 'Fri', minutes: 0 },
          { day: 'Sat', minutes: 0 },
          { day: 'Sun', minutes: 0 },
        ];

        if (dailyLogs) {
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          dailyLogs.forEach(row => {
            const date = new Date(row.date);
            const dayName = daysOfWeek[date.getDay()];
            const matchIndex = defaultTimeData.findIndex(d => d.day === dayName);
            if (matchIndex !== -1) {
              // Convert seconds to minutes
              defaultTimeData[matchIndex].minutes += Math.round((row.study_time || 0) / 60);
            }
          });
        }
        setWeeklyTime(defaultTimeData);

        // 3. Fetch Quiz attempts for Subject Accuracies
        const { data: quizzes } = await supabase
          .from('quiz_attempts')
          .select('score, answers')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (quizzes) {
          setTotalSessions(quizzes.length);
          // Hardcode mock subject accuracy breakdown for aesthetic demonstration if no quizzes taken
          if (quizzes.length === 0) {
            setSubjectStats([
              { subject: 'Organic Chemistry', accuracy: 85 },
              { subject: 'Cognitive Science', accuracy: 72 },
              { subject: 'Computer Architecture', accuracy: 90 },
            ]);
          } else {
            // Aggregate score accuracy average
            const avgScore = Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length);
            setSubjectStats([
              { subject: 'Average Performance', accuracy: avgScore }
            ]);
          }
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Colors for Mastery Level Pie Chart slices
  const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#10B981'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <BarChart2 className="h-7 w-7 text-primary" />
          Progress Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">Visualize your memory mastery levels, weekly study hours, and exam strengths.</p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Streak */}
        <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
            <Flame className="h-6 w-6 fill-amber-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Study Streak</span>
            <span className="text-lg font-black text-white">{profile?.streak || 0} Days</span>
          </div>
        </div>

        {/* Level */}
        <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">User Level</span>
            <span className="text-lg font-black text-white">Lvl {profile?.level || 1}</span>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 text-accent">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Daily Goal</span>
            <span className="text-lg font-black text-white">{profile?.daily_goal || 10} Cards</span>
          </div>
        </div>

        {/* Total session */}
        <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20 text-secondary">
            <Hourglass className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Quizzes Taken</span>
            <span className="text-lg font-black text-white">{totalSessions} Sessions</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Mastery Distribution Pie */}
        <div className="lg:col-span-5 glass p-6 rounded-2xl border-white/5 space-y-4 flex flex-col">
          <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Mastery Stages Distribution</h3>
          
          {masteryData.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-16 text-center flex-grow flex items-center justify-center">
              Practice flashcards to record mastery stages!
            </p>
          ) : (
            <div className="flex-grow flex flex-col justify-center items-center h-64">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={masteryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {masteryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend indicators */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px] font-bold text-slate-400 mt-2">
                {masteryData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Study Time Bar Chart */}
        <div className="lg:col-span-7 glass p-6 rounded-2xl border-white/5 space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Weekly Study Minutes</h3>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTime}>
                <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                />
                <Bar dataKey="minutes" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Weak Subjects breakdown */}
      <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
        <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2 flex items-center gap-2">
          <Target className="h-4.5 w-4.5 text-accent" />
          Subject-Wise Grading Performance
        </h3>
        
        <div className="space-y-4">
          {subjectStats.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-300">{item.subject}</span>
                <span className={`font-bold ${item.accuracy >= 80 ? 'text-emerald-400' : item.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {item.accuracy}% Accuracy
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    item.accuracy >= 80 ? 'bg-emerald-500' : item.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${item.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
