'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  HelpCircle, 
  Play, 
  Check, 
  X, 
  ArrowRight, 
  Loader2, 
  Award, 
  Timer, 
  Brain,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { marked } from 'marked';

interface Subject {
  id: string;
  title: string;
}

interface QuizQuestion {
  id: number;
  type: 'MCQ' | 'True/False' | 'Fill Blank';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function QuizModePage() {
  const { user, addXP } = useAuth();
  
  // Customization Form States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('All');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  // Active Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Results State
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [explanationText, setExplanationText] = useState<string>('');
  const [explainingId, setExplainingId] = useState<number | null>(null);

  // Timer intervals
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

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

  // Build/Start Quiz
  const handleStartQuiz = async () => {
    if (!user) return;
    setLoading(true);
    setQuizQuestions([]);
    setSeconds(0);
    setUserAnswers({});
    setQuizFinished(false);
    setExplanationText('');

    try {
      // 1. Fetch relevant flashcards
      let query = supabase
        .from('flashcards')
        .select('question, answer, explanation, difficulty, tags')
        .eq('user_id', user.id);

      if (selectedSubjectId !== 'All') {
        query = query.eq('subject_id', selectedSubjectId);
      }

      const { data: cards, error } = await query;
      if (error) throw error;

      if (!cards || cards.length === 0) {
        alert('You do not have any saved flashcards in this subject. Generate cards first.');
        setLoading(false);
        return;
      }

      // 2. Call generate quiz route
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcards: cards.slice(0, 30), // send a max of 30 cards to prevent payload bloat
          count: questionCount
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate quiz questions.');
      }

      const data = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('AI returned an empty quiz. Please generate more flashcards.');
      }

      setQuizQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setQuizActive(true);
      setTimerRunning(true);
    } catch (err: any) {
      alert(err.message || 'Error creating quiz.');
    } finally {
      setLoading(false);
    }
  };

  // Select option or fill blank
  const handleAnswerSelect = (answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  // Evaluate & finish quiz
  const finishQuiz = async () => {
    setTimerRunning(false);
    setQuizActive(false);

    let correct = 0;
    const wrongList: any[] = [];
    const topicsFailed: Set<string> = new Set();

    quizQuestions.forEach((q, index) => {
      const userAnswer = (userAnswers[index] || '').trim().toLowerCase();
      const correctAnswer = q.correctAnswer.trim().toLowerCase();
      
      const isCorrect = userAnswer === correctAnswer || 
                        (q.type === 'Fill Blank' && correctAnswer.includes(userAnswer) && userAnswer.length > 1);

      if (isCorrect) {
        correct++;
      } else {
        wrongList.push({
          q,
          userAnswer: userAnswers[index] || 'No Answer',
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        });
        topicsFailed.add(q.explanation.substring(0, 20)); // Extract small concept tags
      }
    });

    const finalScore = Math.round((correct / quizQuestions.length) * 100);
    setScore(finalScore);
    setWrongQuestions(wrongList);
    setWeakTopics(Array.from(topicsFailed));
    setQuizFinished(true);

    // Save attempt to database
    try {
      const detailAnswers = quizQuestions.map((q, idx) => ({
        question: q.question,
        user_answer: userAnswers[idx] || 'No Answer',
        correct_answer: q.correctAnswer,
        correct: (userAnswers[idx] || '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
        feedback: q.explanation
      }));

      await supabase.from('quiz_attempts').insert({
        user_id: user?.id,
        score: finalScore,
        total_questions: quizQuestions.length,
        time_taken: seconds,
        answers: detailAnswers
      });

      // Add XP
      const xpEarned = correct * 10; // 10 XP per correct quiz question
      await addXP(xpEarned);

      // Aggregated stats update
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
            quiz_score: finalScore
          })
          .eq('id', analyticsRow.id);
      } else {
        await supabase
          .from('analytics')
          .insert({
            user_id: user?.id,
            date: today,
            quiz_score: finalScore
          });
      }

      if (finalScore >= 80) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Error logging quiz results:', err);
    }
  };

  // AI Explain a question / topic
  const askAIExplanation = async (questionId: number, questionText: string, correctAnswer: string) => {
    setExplainingId(questionId);
    setExplanationText('');
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: `Question: ${questionText}. Correct Answer: ${correctAnswer}.`,
          context: `The student got this question wrong in a quiz session. Please explain the concepts clearly.`,
          language: 'English'
        })
      });

      if (!response.ok) throw new Error('Failed to get AI explanation.');
      const data = await response.json();
      setExplanationText(data.explanation);
    } catch (err) {
      console.error(err);
      setExplanationText('Failed to pull AI details. Please retry.');
    }
  };

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
          <HelpCircle className="h-7 w-7 text-primary" />
          Quiz Arena
        </h1>
        <p className="text-slate-400 text-sm mt-1">Convert your active flashcards into dynamically graded quizzes to test your understanding.</p>
      </div>

      {/* Form configuration before starting */}
      {!quizActive && !quizFinished && (
        <div className="glass p-8 rounded-3xl border-white/5 max-w-xl mx-auto space-y-6">
          <h3 className="font-extrabold text-white text-lg border-b border-white/5 pb-2">Generate Assessment</h3>

          <div className="space-y-4">
            {/* Subject filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Quiz Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
              >
                <option value="All">Evaluate All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Questions count */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Assessment Size</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                Drafting AI Assessment...
              </>
            ) : (
              <>
                <Play className="h-4.5 w-4.5 fill-white" />
                Generate & Start Quiz
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Quiz Taker */}
      {quizActive && quizQuestions.length > 0 && (
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="flex justify-between items-center p-4 glass rounded-2xl border-white/5 text-sm font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <Timer className="h-4.5 w-4.5 text-primary" />
              Elapsed: {formatTime(seconds)}
            </span>
            <span>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/60 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex) / quizQuestions.length) * 100}%` }}
            />
          </div>

          {/* Active Question Box */}
          <div className="glass p-6 md:p-8 rounded-3xl border-white/10 glow-primary space-y-6 select-none">
            <div className="text-[10px] uppercase font-bold tracking-widest text-primary">
              Question Style: {quizQuestions[currentQuestionIndex].type}
            </div>

            <h3 className="text-white text-lg md:text-xl font-bold leading-relaxed">
              {quizQuestions[currentQuestionIndex].question}
            </h3>

            {/* Answer Input Forms based on type */}
            {quizQuestions[currentQuestionIndex].type === 'Fill Blank' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  value={userAnswers[currentQuestionIndex] || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-primary transition"
                />
              </div>
            ) : (
              /* MCQ & True/False options list */
              <div className="grid grid-cols-1 gap-3">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                  const selected = userAnswers[currentQuestionIndex] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 rounded-xl text-left text-xs md:text-sm font-semibold border transition ${
                        selected 
                          ? 'bg-primary/20 border-primary text-white' 
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-850 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Next trigger */}
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                {currentQuestionIndex + 1 === quizQuestions.length ? 'Submit Assessment' : 'Next Question'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Results View */}
      {quizFinished && (
        <div className="space-y-8">
          
          {/* Scoring Header */}
          <div className="glass p-8 rounded-3xl border-white/10 text-center space-y-5 max-w-md mx-auto glow-secondary">
            <Award className="h-16 w-16 text-accent mx-auto" />
            <div>
              <h3 className="font-extrabold text-white text-2xl">Quiz Finished!</h3>
              <p className="text-slate-400 text-xs mt-1">Excellent assessment review. Scores logged securely.</p>
            </div>
            
            <div className="text-5xl font-black text-white">{score}%</div>

            <div className="grid grid-cols-3 gap-2 text-xs font-bold py-2 border-t border-b border-white/5 text-slate-400">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Correct</span>
                <span className="text-white text-sm">{quizQuestions.length - wrongQuestions.length} / {quizQuestions.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Time Taken</span>
                <span className="text-white text-sm">{formatTime(seconds)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">XP Earned</span>
                <span className="text-accent text-sm">+{ (quizQuestions.length - wrongQuestions.length) * 10 } XP</span>
              </div>
            </div>

            <button
              onClick={() => {
                setQuizFinished(false);
                setQuizActive(false);
                setQuizQuestions([]);
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 text-white font-bold rounded-xl transition"
            >
              Start New Assessment
            </button>
          </div>

          {/* Recommendations / Weak Topics */}
          {weakTopics.length > 0 && (
            <div className="glass p-6 rounded-2xl border-white/5 space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-bold text-white text-sm">Weak Subject Recommendations</h4>
              </div>
              <p className="text-slate-400 text-xs">Based on questions missed, the AI recommends reviewing these topic concepts:</p>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic, i) => (
                  <span key={i} className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-[10px] text-slate-300 font-bold">
                    {topic}...
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Review List */}
          <div className="space-y-6">
            <h3 className="font-extrabold text-white text-lg border-b border-white/5 pb-2">Incorrect Answers Review ({wrongQuestions.length})</h3>
            
            {wrongQuestions.length === 0 ? (
              <div className="glass p-8 rounded-2xl border-white/5 text-center text-slate-400 text-sm">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                Perfect Score! You answered all questions correctly. Keep it up!
              </div>
            ) : (
              wrongQuestions.map((item, idx) => (
                <div key={idx} className="glass p-6 rounded-2xl border-white/5 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold bg-slate-900 border border-white/5 text-slate-500 px-2 py-0.5 rounded uppercase">
                        Question {idx + 1}
                      </span>
                      <h4 className="text-white text-sm md:text-base font-semibold leading-relaxed pt-1.5">{item.q.question}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 rounded-xl">
                      <strong>Your Answer:</strong> {item.userAnswer}
                    </div>
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl">
                      <strong>Correct Answer:</strong> {item.correctAnswer}
                    </div>
                  </div>

                  {item.explanation && (
                    <div className="p-3 bg-slate-950/40 border border-white/5 text-slate-400 text-xs rounded-xl italic">
                      <strong>Explanation:</strong> {item.explanation}
                    </div>
                  )}

                  {/* Ask AI Explanation */}
                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      onClick={() => askAIExplanation(idx, item.q.question, item.q.correctAnswer)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 border border-white/10 text-slate-300 font-bold rounded-xl text-[10px] flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      AI Explain Topic
                    </button>
                  </div>

                  {/* Render inline AI explanation details if pulled */}
                  {explainingId === idx && (
                    <div className="p-5 bg-slate-900 border border-primary/20 rounded-xl text-slate-300 text-xs space-y-2 animate-in slide-in-from-top-1">
                      <div className="flex items-center gap-1.5 text-primary font-bold border-b border-white/5 pb-1.5">
                        <Brain className="h-4 w-4" />
                        AI Detailed Explanation
                      </div>
                      {!explanationText ? (
                        <div className="flex items-center gap-2 py-4 justify-center text-slate-500">
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          Consulting DeepSeek AI...
                        </div>
                      ) : (
                        <div 
                          className="prose prose-invert prose-xs leading-relaxed text-slate-300"
                          dangerouslySetInnerHTML={{ __html: marked.parse(explanationText) }}
                        />
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
}
