'use client';

import React, { useState } from 'react';
import { 
  Star, 
  Volume2, 
  VolumeX, 
  Copy, 
  Share2, 
  Edit, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  Check
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export interface FlashcardData {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  question: string;
  answer: string;
  explanation: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  favorite: boolean;
  mastery_level: number;
  review_date: string;
  repetitions: number;
  interval: number;
  ease_factor: number;
  source_type?: string;
}

interface FlashcardComponentProps {
  card: FlashcardData;
  onFavoriteToggle?: (id: string, current: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (card: FlashcardData) => void;
  onSaveNotes?: (id: string, notes: string) => void;
  savedNotes?: string;
}

export default function FlashcardComponent({
  card,
  onFavoriteToggle,
  onDelete,
  onEdit,
  onSaveNotes,
  savedNotes = ''
}: FlashcardComponentProps) {
  const { user } = useAuth();
  
  const [flipped, setFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(savedNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Text-To-Speech Pronunciation
  const speakText = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Avoid flipping card when clicking TTS button
    
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Text to speech is not supported in this browser.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Clipboard copy
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `Q: ${card.question}\nA: ${card.answer}${card.explanation ? `\nExplanation: ${card.explanation}` : ''}`;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Share card (mock or Web Share API)
  const shareCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: 'Flashcard from FlashMind AI',
        text: `Check out this flashcard: Q: ${card.question}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`Sharing link: ${window.location.origin}/dashboard/flashcards?id=${card.id}`);
    }
  };

  const handleSaveNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveNotes) {
      onSaveNotes(card.id, localNotes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 3D Card Shell */}
      <div 
        onClick={() => setFlipped(!flipped)}
        className="perspective-1000 w-full h-[280px] md:h-[320px] cursor-pointer"
      >
        <div className={`relative w-full h-full preserve-3d duration-500 ease-in-out ${flipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT Side */}
          <div className="absolute inset-0 w-full h-full backface-hidden glass rounded-3xl p-6 md:p-8 flex flex-col justify-between border-white/10 glow-primary select-none">
            <div className="flex justify-between items-center text-[10px] tracking-widest font-extrabold uppercase text-slate-500">
              <span>Front (Question)</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  card.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  card.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {card.difficulty}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="flex-grow flex items-center justify-center py-4">
              <p className="text-lg md:text-xl font-bold text-center text-white leading-relaxed">
                {card.question}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              {/* Left Side: TTS & Copy */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => speakText(e, card.question)}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                  title="Pronounce question"
                >
                  {speaking ? <VolumeX className="h-4.5 w-4.5 text-primary" /> : <Volume2 className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                  title="Copy card"
                >
                  {copied ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                </button>
              </div>

              {/* Center: Tap Hint */}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Click to Flip</span>

              {/* Right Side: Favorite */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFavoriteToggle) onFavoriteToggle(card.id, card.favorite);
                }}
                className={`p-2 rounded-lg hover:bg-white/5 transition ${card.favorite ? 'text-amber-400' : 'text-slate-500 hover:text-white'}`}
                title="Favorite card"
              >
                <Star className="h-4.5 w-4.5 fill-current" />
              </button>
            </div>
          </div>

          {/* BACK Side */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 glass rounded-3xl p-6 md:p-8 flex flex-col justify-between border-white/10 glow-secondary select-none">
            <div className="flex justify-between items-center text-[10px] tracking-widest font-extrabold uppercase text-slate-500">
              <span>Back (Answer)</span>
              <span className="text-slate-400 font-semibold">{card.tags.join(', ')}</span>
            </div>

            {/* Answer & Explanation */}
            <div className="flex-grow flex flex-col items-center justify-center py-4 overflow-y-auto no-scrollbar">
              <p className="text-base md:text-lg font-bold text-center text-white leading-relaxed">
                {card.answer}
              </p>
              {card.explanation && (
                <p className="text-xs text-slate-400 text-center mt-3 max-w-sm border-t border-white/5 pt-2 leading-relaxed italic">
                  {card.explanation}
                </p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              {/* Left Side Actions */}
              <div className="flex gap-0.5">
                <button
                  onClick={(e) => speakText(e, card.answer)}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                  title="Pronounce answer"
                >
                  {speaking ? <VolumeX className="h-4.5 w-4.5 text-secondary" /> : <Volume2 className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={shareCard}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                  title="Share card"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(card);
                    }}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                    title="Edit card"
                  >
                    <Edit className="h-4.5 w-4.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(card.id);
                    }}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition"
                    title="Delete card"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              {/* Tap Hint */}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Click to Flip</span>

              {/* Right Side: Favorite */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFavoriteToggle) onFavoriteToggle(card.id, card.favorite);
                }}
                className={`p-2 rounded-lg hover:bg-white/5 transition ${card.favorite ? 'text-amber-400' : 'text-slate-500 hover:text-white'}`}
                title="Favorite card"
              >
                <Star className="h-4.5 w-4.5 fill-current" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Extra Notes text area accordion */}
      {onSaveNotes && (
        <div className="glass rounded-2xl border-white/5 p-4 space-y-3">
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            <span>Personal Study Notes</span>
            {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {notesOpen && (
            <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Add calculations, diagrams, or memory links here..."
                rows={2}
                className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-primary transition resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] flex items-center gap-1 border border-white/5 transition"
                >
                  {notesSaved ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Notes Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3" />
                      Save Notes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
