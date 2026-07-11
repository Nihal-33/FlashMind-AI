'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { calculateSM2, getSM2Quality } from '@/lib/sm2';
import FlashcardComponent, { FlashcardData } from '@/components/flashcard-component';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Timer, 
  Keyboard, 
  CheckCircle, 
  ChevronRight, 
  Shuffle, 
  Loader2,
  Award,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Subject {
  id: string;
  title: string;
}

export default function StudyModePage() {
  const { user, addXP, updateStreak } = useAuth();
  
  // Settings & Selection
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('All');
  const [sessionSource, setSessionSource] = useState<'Due' | 'All'>('Due'); // Due reviews only, or practice all cards

  // Session State
  const [sessionCards, setSessionCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studiedCount, setStudiedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats / Timers
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play settings
  const [autoplay, setAutoplay] = useState(false);
  const [autoplayInterval, setAutoplayInterval] = useState(5); // seconds
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('subjects')
        .select('id, title')
        .eq('user_id', user.id);
      if (data) setSubjects(data as Subject[]);
    };
    loadSubjects();
  }, [user]);

  // Stopwatch timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Autoplay handler
  useEffect(() => {
    if (autoplay && sessionActive && sessionCards.length > 0) {
      autoplayRef.current = setInterval(() => {
        // Find if active element is flipped
        // Click flip then move next
        const currentCard = sessionCards[currentIndex];
        // We can just simulate auto pacing:
        // Every X seconds, flip or rate good and go next
        // For simplicity: auto flips card, waits, then simulates Good rating
        handleRating('good');
      }, autoplayInterval * 1000);
    } else {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, currentIndex, sessionActive, sessionCards]);

  // Start study session
  const startSession = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    setSeconds(0);
    setStudiedCount(0);
    setCorrectCount(0);
    
    try {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id);

      if (selectedSubjectId !== 'All') {
        query = query.eq('subject_id', selectedSubjectId);
      }

      if (sessionSource === 'Due') {
        const todayStr = new Date().toISOString();
        query = query.lte('review_date', todayStr);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert(sessionSource === 'Due' 
          ? 'No cards due for review! Try changing source to "Practice All" to study.' 
          : 'No flashcards found in this subject. Generate cards first.');
        setLoading(false);
        return;
      }

      // Shuffle cards by default
      const shuffled = [...data].sort(() => Math.random() - 0.5);

      // Start session log in DB
      const { data: sessionLog, error: logErr } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (logErr) throw logErr;

      setSessionCards(shuffled as FlashcardData[]);
      setCurrentIndex(0);
      setSessionActive(true);
      setTimerRunning(true);
      setSessionLogId(sessionLog.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [sessionLogId, setSessionLogId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle rating with SM-2 Spaced Repetition logic
  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (sessionCards.length === 0) return;

    const currentCard = sessionCards[currentIndex];
    const quality = getSM2Quality(rating);

    // SM-2 calculations
    const previous = {
      repetitions: currentCard.repetitions || 0,
      interval: currentCard.interval || 1,
      easeFactor: Number(currentCard.ease_factor) || 2.5
    };

    const result = calculateSM2(quality, previous);

    try {
      // Update flashcard schedule in database
      const { error } = await supabase
        .from('flashcards')
        .update({
          review_date: result.reviewDate.toISOString(),
          repetitions: result.repetitions,
          interval: result.interval,
          ease_factor: result.easeFactor,
          mastery_level: quality >= 3 ? Math.min(5, (currentCard.mastery_level || 0) + 1) : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCard.id);

      if (error) throw error;

      // Local stats updates
      setStudiedCount(prev => prev + 1);
      if (quality >= 3) {
        setCorrectCount(prev => prev + 1);
        await addXP(5); // +5 XP for correct recall
      } else {
        await addXP(2); // +2 XP for attempting
      }

      // If user failed card (Again), put it at the end of the queue so they see it again in this session
      if (rating === 'again') {
        setSessionCards(prev => {
          const updated = [...prev];
          updated.push(currentCard);
          return updated;
        });
      }

      // Move next
      if (currentIndex + 1 < sessionCards.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // End of session!
        endSession();
      }
    } catch (err) {
      console.error('Error updating review state:', err);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sessionActive || sessionCards.length === 0) return;

      // Avoid shortcuts if typing in notes textarea
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        // Flip card trigger
        // We can simulate flipping card by targeting elements or state.
        // Flipped state is local to FlashcardComponent, but keyboard shortcuts are global.
        // We can hook it up or explain to users. For standard web apps, button triggers are easiest.
      } else if (e.key === '1') {
        handleRating('again');
      } else if (e.key === '2') {
        handleRating('hard');
      } else if (e.key === '3') {
        handleRating('good');
      } else if (e.key === '4') {
        handleRating('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionActive, currentIndex, sessionCards]);

  // End study session
  const endSession = async () => {
    setTimerRunning(false);
    setAutoplay(false);

    try {
      // 1. Update session log in DB
      if (sessionLogId) {
        await supabase
          .from('study_sessions')
          .update({
            end_time: new Date().toISOString(),
            cards_studied: studiedCount,
            correct_count: correctCount
          })
          .eq('id', sessionLogId);
      }

      // 2. Sync Streak
      await updateStreak();

      // 3. Update aggregated Daily Analytics
      const today = new Date().toISOString().split('T')[0];
      const { data: analyticsRow } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      if (analyticsRow) {
        await supabase
          .from('analytics')
          .update({
            cards_studied: (analyticsRow.cards_studied || 0) + studiedCount,
            study_time: (analyticsRow.study_time || 0) + seconds
          })
          .eq('id', analyticsRow.id);
      } else {
        await supabase
          .from('analytics')
          .insert({
            user_id: user?.id,
            date: today,
            cards_studied: studiedCount,
            study_time: seconds
          });
      }

      // Confetti fire!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Error logging session:', err);
    }

    // Keep active session overlay open to show results
  };

  const resetSessionSelection = () => {
    setSessionActive(false);
    setSessionCards([]);
    setCurrentIndex(0);
    setSeconds(0);
  };

  const currentCard = sessionCards[currentIndex];
  const progressPercent = sessionCards.length > 0 
    ? Math.round((currentIndex / sessionCards.length) * 100) 
    : 0;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Timer className="h-7 w-7 text-primary" />
          Study Mode
        </h1>
        <p className="text-slate-400 text-sm mt-1">Review active decks using the scientific SM-2 spaced repetition scheduler.</p>
      </div>

      {/* Selector Dashboard (Before starting) */}
      {!sessionActive ? (
        <div className="glass p-8 rounded-3xl border-white/5 max-w-xl mx-auto space-y-6">
          <h3 className="font-extrabold text-white text-lg border-b border-white/5 pb-2">Configure Review Session</h3>

          <div className="space-y-4">
            {/* Subject selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Study Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
              >
                <option value="All">Study All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Session source toggles */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Review Material</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSessionSource('Due')}
                  className={`py-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    sessionSource === 'Due' 
                      ? 'border-primary bg-primary/10 text-white' 
                      : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Due Cards Only</span>
                  <span className="text-[9px] text-slate-500 font-normal">Spaced repetition schedule</span>
                </button>
                <button
                  onClick={() => setSessionSource('All')}
                  className={`py-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    sessionSource === 'All' 
                      ? 'border-primary bg-primary/10 text-white' 
                      : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Practice All</span>
                  <span className="text-[9px] text-slate-500 font-normal">Study the entire deck</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-4.5 w-4.5 fill-white" />
                Start Review Session
              </>
            )}
          </button>
        </div>
      ) : (
        /* Active Study Arena */
        <div className="space-y-6">
          
          {/* Header Dashboard stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass rounded-2xl border-white/5">
            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                <Timer className="h-4.5 w-4.5 text-primary" />
                <span>Session Time: {formatTime(seconds)}</span>
              </div>
              
              {/* Progress Count */}
              <div className="text-slate-400 text-xs font-semibold">
                Cards studied: <strong className="text-white">{currentIndex}</strong> / {sessionCards.length}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Autoplay toggles */}
              <button
                onClick={() => setAutoplay(!autoplay)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                  autoplay 
                    ? 'bg-secondary/20 text-secondary border-secondary/30 animate-pulse' 
                    : 'bg-slate-850 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {autoplay ? 'Autoplay ON' : 'Autoplay OFF'}
              </button>

              {/* End button */}
              <button
                onClick={endSession}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Quit Session
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/60 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Card Display Container */}
          {currentIndex < sessionCards.length ? (
            <div className="space-y-6">
              <FlashcardComponent card={currentCard} />

              {/* SM-2 rating buttons */}
              <div className="glass p-5 rounded-3xl border-white/10 max-w-xl mx-auto space-y-4 glow-primary">
                <p className="text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                  How well did you recall this card?
                </p>
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  
                  {/* Again rating */}
                  <button
                    onClick={() => handleRating('again')}
                    className="py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/20 hover:border-red-500/40 font-bold rounded-xl text-xs flex flex-col items-center gap-1 transition"
                  >
                    <span>Again</span>
                    <span className="text-[8px] text-red-500 font-semibold uppercase">Incorrect</span>
                  </button>

                  {/* Hard rating */}
                  <button
                    onClick={() => handleRating('hard')}
                    className="py-3 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 font-bold rounded-xl text-xs flex flex-col items-center gap-1 transition"
                  >
                    <span>Hard</span>
                    <span className="text-[8px] text-amber-500 font-semibold uppercase">Review</span>
                  </button>

                  {/* Good rating */}
                  <button
                    onClick={() => handleRating('good')}
                    className="py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 font-bold rounded-xl text-xs flex flex-col items-center gap-1 transition"
                  >
                    <span>Good</span>
                    <span className="text-[8px] text-primary/70 font-semibold uppercase">Hesitant</span>
                  </button>

                  {/* Easy rating */}
                  <button
                    onClick={() => handleRating('easy')}
                    className="py-3 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 font-bold rounded-xl text-xs flex flex-col items-center gap-1 transition"
                  >
                    <span>Easy</span>
                    <span className="text-[8px] text-emerald-500 font-semibold uppercase">Perfect</span>
                  </button>

                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="flex justify-center items-center gap-4 text-[10px] text-slate-500 border-t border-white/5 pt-3.5 font-semibold">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5">1</kbd> Again
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5">2</kbd> Hard
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5">3</kbd> Good
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5">4</kbd> Easy
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Results Panel (End of session screen) */
            <div className="glass p-8 rounded-3xl border-white/5 max-w-md mx-auto text-center space-y-6 glow-secondary">
              <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
              <div>
                <h3 className="font-extrabold text-white text-2xl">Session Completed!</h3>
                <p className="text-slate-400 text-xs mt-1">Outstanding job! Spaced repetition scheduler updated successfully.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-white/5 text-left">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Study Duration</span>
                  <span className="text-lg font-bold text-white">{formatTime(seconds)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Accuracy Rate</span>
                  <span className="text-lg font-bold text-white">
                    {studiedCount > 0 ? Math.round((correctCount / studiedCount) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Cards Reviewed</span>
                  <span className="text-lg font-bold text-white">{studiedCount} cards</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">XP Earned</span>
                  <span className="text-lg font-bold text-accent flex items-center gap-1">
                    <Award className="h-4.5 w-4.5 text-accent" />
                    +{correctCount * 5 + (studiedCount - correctCount) * 2} XP
                  </span>
                </div>
              </div>

              <button
                onClick={resetSessionSelection}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow transition"
              >
                Close Review Arena
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
