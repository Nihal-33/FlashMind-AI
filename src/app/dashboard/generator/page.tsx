'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  Sparkles, 
  FileText, 
  Upload, 
  Keyboard, 
  Mic, 
  HelpCircle, 
  Layers, 
  Plus, 
  Check, 
  Loader2, 
  Trash2,
  AlertCircle,
  HelpCircle as HelpIcon,
  Flame,
  CheckCircle2,
  Languages
} from 'lucide-react';

// Configure pdfjs-dist for text extraction
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface Subject {
  id: string;
  title: string;
}

interface Topic {
  id: string;
  subject_id: string;
  title: string;
}

interface GeneratedCard {
  question: string;
  answer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  subject?: string;
  topic?: string;
}

export default function GeneratorPage() {
  const { user, addXP } = useAuth();
  const router = useRouter();

  // DB categories
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

  // Form inputs
  const [inputMode, setInputMode] = useState<'text' | 'file' | 'voice'>('text');
  const [textNotes, setTextNotes] = useState('');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState('');
  const [parsingFile, setParsingFile] = useState(false);

  // Configuration options
  const [cardCount, setCardCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [language, setLanguage] = useState<string>('English');
  const [cardStyle, setCardStyle] = useState<'Question Answer' | 'Definition' | 'Fill in Blank' | 'True False' | 'Multiple Choice' | 'Concept Summary'>('Question Answer');

  // Generator Running states
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);

  // Voice recording mock/state
  const [recording, setRecording] = useState(false);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('subjects')
        .select('id, title')
        .eq('user_id', user.id);

      if (!error && data) {
        setSubjects(data as Subject[]);
      }
    };
    loadSubjects();
  }, [user]);

  // Load topics when subject changes
  useEffect(() => {
    const loadTopics = async () => {
      if (!selectedSubjectId) {
        setTopics([]);
        return;
      }
      const { data, error } = await supabase
        .from('topics')
        .select('id, subject_id, title')
        .eq('subject_id', selectedSubjectId);

      if (!error && data) {
        setTopics(data as Topic[]);
      }
    };
    loadTopics();
  }, [selectedSubjectId]);

  // Parse text files & PDFs
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsingFile(true);
    setErrorMsg('');
    setFileText('');

    try {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (extension === 'txt' || extension === 'md') {
        const text = await selectedFile.text();
        setFileText(text);
      } else if (extension === 'pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          extractedText += strings.join(' ') + '\n';
        }

        if (!extractedText.trim()) {
          throw new Error('This PDF seems to contain only scanned images. Extracting plain text failed.');
        }

        setFileText(extractedText);
      } else {
        throw new Error('Unsupported file type. Please upload a .pdf, .txt, or .md file.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reading the file.');
      setFile(null);
    } finally {
      setParsingFile(false);
    }
  };

  // Mock Voice Dictation using browser SpeechRecognition
  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    
    // Check SpeechRecognition support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Pasting text notes is recommended.');
      return;
    }

    if (recording) {
      setRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setRecording(true);
      setErrorMsg('');
    };

    rec.onresult = (event: any) => {
      let speechResult = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        speechResult += event.results[i][0].transcript;
      }
      setTextNotes(prev => prev + ' ' + speechResult);
    };

    rec.onerror = (e: any) => {
      console.error('Speech recognition error:', e);
      setRecording(false);
    };

    rec.onend = () => {
      setRecording(false);
    };

    rec.start();
  };

  // Run AI Flashcard Generator
  const generateCards = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedCards([]);

    const contentSource = inputMode === 'text' ? textNotes : fileText;

    if (!contentSource.trim()) {
      setErrorMsg('Please supply study notes, paste content, or upload a document to analyze.');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentSource,
          count: cardCount,
          difficulty,
          style: cardStyle,
          language
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Flashcard generation failed.');
      }

      const data = await response.json();
      if (!data.flashcards || data.flashcards.length === 0) {
        throw new Error('AI returned an empty deck. Please try again with longer text.');
      }

      setGeneratedCards(data.flashcards);
      setSuccessMsg(`Successfully generated ${data.flashcards.length} smart flashcards!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // Save generated cards to database
  const saveGeneratedCards = async () => {
    if (generatedCards.length === 0 || !user) return;
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // If user hasn't selected a subject, automatically create one based on AI's subject name
      let subId = selectedSubjectId || null;
      let topId = selectedTopicId || null;

      const subTitle = generatedCards[0].subject || 'AI Generated';
      const topTitle = generatedCards[0].topic || 'General Chapter';

      if (!subId) {
        // Create subject
        const { data: newSub, error: subErr } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            title: subTitle,
            color: '#7C3AED',
            icon: 'BookOpen'
          })
          .select()
          .single();

        if (subErr) throw subErr;
        subId = newSub.id;

        // Create topic
        const { data: newTop, error: topErr } = await supabase
          .from('topics')
          .insert({
            subject_id: subId,
            title: topTitle
          })
          .select()
          .single();

        if (topErr) throw topErr;
        topId = newTop.id;
      }

      // Map generated cards to db schema rows
      const rows = generatedCards.map(c => ({
        user_id: user.id,
        subject_id: subId,
        topic_id: topId,
        question: c.question,
        answer: c.answer,
        explanation: c.explanation,
        difficulty: c.difficulty,
        tags: c.tags,
        source_type: inputMode === 'file' ? 'pdf' : 'text',
        review_date: new Date().toISOString(),
        mastery_level: 0,
        favorite: false
      }));

      const { error } = await supabase.from('flashcards').insert(rows);
      if (error) throw error;

      // Add XP & streak triggers
      await addXP(rows.length * 5); // 5 XP per card created
      setSuccessMsg(`Perfect! Saved ${rows.length} cards to your collection and earned ${rows.length * 5} XP!`);
      setGeneratedCards([]);
      
      // Redirect to flashcards page after a short delay
      setTimeout(() => {
        router.push('/dashboard/flashcards');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save flashcards.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary animate-pulse" />
          AI Flashcard Generator
        </h1>
        <p className="text-slate-400 text-sm mt-1">Convert your course files, class recordings, or notes into customized review cards instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Inputs & Options */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Input Method Toggles */}
          <div className="glass p-1.5 rounded-xl border-white/5 flex gap-1">
            <button
              onClick={() => setInputMode('text')}
              className={`flex-grow py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                inputMode === 'text' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="h-4 w-4" />
              Paste Notes
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`flex-grow py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                inputMode === 'file' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload PDF / TXT
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={`flex-grow py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                inputMode === 'voice' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="h-4 w-4" />
              Voice Input
            </button>
          </div>

          {/* Input Panels */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            {inputMode === 'text' && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Study Materials / Text Notes
                </label>
                <textarea
                  value={textNotes}
                  onChange={(e) => setTextNotes(e.target.value)}
                  placeholder="Paste textbook definitions, lecture transcripts, or notes here..."
                  rows={8}
                  className="w-full p-4 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-primary transition resize-none"
                />
              </div>
            )}

            {inputMode === 'file' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-slate-900/50 hover:bg-slate-900 hover:border-primary/50 transition relative cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-300 font-semibold">
                    {file ? file.name : 'Select Study Document'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF, TXT, or MD files. Up to 10MB.</p>
                </div>

                {parsingFile && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Extracting document text...
                  </div>
                )}

                {fileText && (
                  <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg text-[10px] text-slate-500 max-h-32 overflow-y-auto">
                    <strong>Extracted Text Preview:</strong> {fileText.substring(0, 300)}...
                  </div>
                )}
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <button
                    onClick={handleVoiceInput}
                    className={`h-16 w-16 rounded-full flex items-center justify-center border transition-all ${
                      recording 
                        ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/20' 
                        : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:scale-105'
                    }`}
                  >
                    <Mic className="h-6 w-6" />
                  </button>
                </div>
                <h4 className="font-bold text-white text-sm">
                  {recording ? 'Recording dictation...' : 'Start Voice Input'}
                </h4>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">
                  Dictate your notes aloud. We will transcribe your voice in real-time, then feed the transcription into the AI generator.
                </p>
                {textNotes && (
                  <div className="text-left mt-4">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Transcribed Draft</label>
                    <textarea
                      value={textNotes}
                      onChange={(e) => setTextNotes(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Option Customizations */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Customizations</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Style */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Card Style</label>
                <select
                  value={cardStyle}
                  onChange={(e: any) => setCardStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value="Question Answer">Standard Q&A</option>
                  <option value="Definition">Definitions (Vocabulary)</option>
                  <option value="Fill in Blank">Fill in Blanks</option>
                  <option value="True False">True / False Statement</option>
                  <option value="Multiple Choice">Multiple Choice MCQ</option>
                  <option value="Concept Summary">Concept Bullet Sheets</option>
                </select>
              </div>

              {/* Card count */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Card Quantity</label>
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value={10}>10 Cards</option>
                  <option value={20}>20 Cards</option>
                  <option value={30}>30 Cards</option>
                  <option value={50}>50 Cards</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Output Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Execution & Outputs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Target Subject Assignment */}
          <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-white/5 pb-2">Category Assignment</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              If left unselected, the AI will automatically create a subject folder based on the analyzed material topic.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject Folder</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedTopicId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value="">AI Auto-Detect Category</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {selectedSubjectId && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Topic Folder</label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                  >
                    <option value="">AI Auto-Detect Chapter</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="glass p-6 rounded-2xl border-white/5 text-center space-y-4">
            
            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl flex gap-2 text-left">
                <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex gap-2 text-left animate-pulse">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              onClick={generateCards}
              disabled={generating || parsingFile}
              className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  Generating AI Cards...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 fill-white text-white" />
                  Generate AI Flashcards
                </>
              )}
            </button>

            {generatedCards.length > 0 && (
              <button
                onClick={saveGeneratedCards}
                disabled={generating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                Save Deck to Library
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Generated Cards Preview section */}
      {generatedCards.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-white text-lg">AI Generated Deck Preview ({generatedCards.length} cards)</h3>
            <span className="text-xs text-slate-400">
              Estimated Study Time: <strong className="text-white">{Math.ceil(generatedCards.length * 0.5)} mins</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedCards.map((card, i) => (
              <div key={i} className="glass p-5 rounded-2xl border-white/5 space-y-3 relative overflow-hidden select-none">
                <div className="absolute top-0 right-0 h-1.5 w-16 bg-gradient-to-r from-primary to-secondary" />
                <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  <span>Card {i + 1}</span>
                  <span>{card.difficulty}</span>
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm">Q: {card.question}</h5>
                  <p className="text-slate-400 text-xs mt-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                    <strong>A:</strong> {card.answer}
                  </p>
                  {card.explanation && (
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic">
                      {card.explanation}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                  {card.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
