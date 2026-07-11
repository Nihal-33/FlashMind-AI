'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import FlashcardComponent, { FlashcardData } from '@/components/flashcard-component';
import { 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Copy, 
  Bookmark, 
  Star, 
  FolderInput, 
  Plus, 
  Loader2,
  SlidersHorizontal,
  X,
  FileDown
} from 'lucide-react';

interface Subject {
  id: string;
  title: string;
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  
  // Data States
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filters / Search
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [favoriteFilter, setFavoriteFilter] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<string>('All'); // 'All' | 'Pending' | 'Completed'

  // Modal Dialogs
  const [editingCard, setEditingCard] = useState<FlashcardData | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  
  const [movingCard, setMovingCard] = useState<FlashcardData | null>(null);
  const [targetSubjectId, setTargetSubjectId] = useState<string>('');

  // Personal card notes state cached locally
  const [cardNotes, setCardNotes] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Flashcards
      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;
      setFlashcards(cards as FlashcardData[]);

      // 2. Fetch Subjects for filter dropdowns
      const { data: subs, error: subsError } = await supabase
        .from('subjects')
        .select('id, title')
        .eq('user_id', user.id);

      if (!subsError && subs) {
        setSubjects(subs as Subject[]);
      }

      // Load cached notes if any or mock
      const notes: Record<string, string> = {};
      cards.forEach(c => {
        notes[c.id] = localStorage.getItem(`notes_${c.id}`) || '';
      });
      setCardNotes(notes);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Reset pagination limit when filters change
  useEffect(() => {
    setDisplayLimit(12);
  }, [searchTerm, difficultyFilter, subjectFilter, favoriteFilter, reviewFilter]);

  // Favorite toggle
  const handleFavoriteToggle = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ favorite: !current })
        .eq('id', id);

      if (error) throw error;
      setFlashcards(prev => prev.map(c => c.id === id ? { ...c, favorite: !current } : c));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Delete card
  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFlashcards(prev => prev.filter(c => c.id !== id));
      localStorage.removeItem(`notes_${id}`);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  // Edit card save
  const handleSaveEdit = async () => {
    if (!editingCard) return;
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          question: editQuestion,
          answer: editAnswer,
          explanation: editExplanation,
          difficulty: editDifficulty,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCard.id);

      if (error) throw error;

      setFlashcards(prev => prev.map(c => c.id === editingCard.id ? {
        ...c,
        question: editQuestion,
        answer: editAnswer,
        explanation: editExplanation,
        difficulty: editDifficulty
      } : c));

      setEditingCard(null);
    } catch (err) {
      console.error('Error editing card:', err);
    }
  };

  // Duplicate card
  const handleDuplicateCard = async (card: FlashcardData) => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user?.id,
          subject_id: card.subject_id,
          topic_id: card.topic_id,
          question: `${card.question} (Copy)`,
          answer: card.answer,
          explanation: card.explanation,
          difficulty: card.difficulty,
          tags: card.tags,
          source_type: card.source_type
        })
        .select()
        .single();

      if (error) throw error;
      setFlashcards(prev => [data as FlashcardData, ...prev]);
    } catch (err) {
      console.error('Error duplicating card:', err);
    }
  };

  // Move card to subject
  const handleMoveCard = async () => {
    if (!movingCard) return;
    try {
      const subId = targetSubjectId === 'null' ? null : targetSubjectId;
      const { error } = await supabase
        .from('flashcards')
        .update({ subject_id: subId })
        .eq('id', movingCard.id);

      if (error) throw error;

      setFlashcards(prev => prev.map(c => c.id === movingCard.id ? { ...c, subject_id: subId } : c));
      setMovingCard(null);
    } catch (err) {
      console.error('Error moving card:', err);
    }
  };

  // Save notes locally
  const handleSaveNotes = (id: string, notes: string) => {
    localStorage.setItem(`notes_${id}`, notes);
    setCardNotes(prev => ({ ...prev, [id]: notes }));
  };

  // EXPORT FLASHCARDS (CSV / JSON / Markdown)
  const exportCards = (format: 'csv' | 'json' | 'md' | 'anki') => {
    if (filteredCards.length === 0) {
      alert('No cards to export.');
      return;
    }

    let mimeType = 'text/plain';
    let filename = `flashmind-export-${new Date().toISOString().split('T')[0]}`;
    let fileContent = '';

    if (format === 'json') {
      mimeType = 'application/json';
      filename += '.json';
      fileContent = JSON.stringify(filteredCards, null, 2);
    } else if (format === 'csv') {
      mimeType = 'text/csv';
      filename += '.csv';
      const headers = ['Question', 'Answer', 'Explanation', 'Difficulty', 'Tags'];
      const rows = filteredCards.map(c => [
        `"${c.question.replace(/"/g, '""')}"`,
        `"${c.answer.replace(/"/g, '""')}"`,
        `"${(c.explanation || '').replace(/"/g, '""')}"`,
        c.difficulty,
        `"${c.tags.join(', ')}"`
      ]);
      fileContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (format === 'md') {
      mimeType = 'text/markdown';
      filename += '.md';
      fileContent = filteredCards.map((c, i) => 
        `## Flashcard ${i + 1}\n\n**Question:**\n${c.question}\n\n**Answer:**\n${c.answer}\n\n${c.explanation ? `**Explanation:**\n${c.explanation}\n\n` : ''}**Difficulty:** ${c.difficulty}\n**Tags:** ${c.tags.join(', ')}\n\n---\n`
      ).join('\n');
    } else if (format === 'anki') {
      // Standard Tab-Separated Anki TXT Import format
      mimeType = 'text/plain';
      filename += '-anki.txt';
      fileContent = filteredCards.map(c => 
        `${c.question.replace(/\n/g, '<br>')}	${c.answer.replace(/\n/g, '<br>')}	${(c.explanation || '').replace(/\n/g, '<br>')}`
      ).join('\n');
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter logic
  const filteredCards = flashcards.filter(card => {
    // Search filter
    const matchesSearch = 
      card.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.explanation && card.explanation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      card.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    // Difficulty filter
    const matchesDifficulty = difficultyFilter === 'All' || card.difficulty === difficultyFilter;

    // Subject filter
    const matchesSubject = subjectFilter === 'All' || card.subject_id === subjectFilter;

    // Favorite filter
    const matchesFavorite = !favoriteFilter || card.favorite;

    // Review schedule filter
    let matchesReview = true;
    if (reviewFilter === 'Pending') {
      matchesReview = new Date(card.review_date) <= new Date();
    } else if (reviewFilter === 'Completed') {
      matchesReview = card.mastery_level >= 3;
    }

    return matchesSearch && matchesDifficulty && matchesSubject && matchesFavorite && matchesReview;
  });

  const displayedCards = filteredCards.slice(0, displayLimit);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Your Flashcard Decks</h1>
          <p className="text-slate-400 text-sm mt-1">Review, filter, edit, or export your library of study flashcards.</p>
        </div>

        {/* Exporters dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/80 rounded-xl border border-white/5 p-1">
            <button 
              onClick={() => exportCards('csv')}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-700/50"
            >
              CSV
            </button>
            <button 
              onClick={() => exportCards('json')}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-700/50"
            >
              JSON
            </button>
            <button 
              onClick={() => exportCards('md')}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-700/50"
            >
              MD
            </button>
            <button 
              onClick={() => exportCards('anki')}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-700/50"
              title="Anki Importable Deck"
            >
              Anki
            </button>
          </div>
          <FileDown className="h-4 w-4 text-slate-500 hidden sm:inline" />
        </div>
      </div>

      {/* Search & Filters block */}
      <div className="glass p-5 rounded-2xl border-white/5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by keywords, tags, or question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-primary transition"
            />
          </div>

          {/* Subject Dropdown */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
            >
              <option value="All">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Dropdown */}
          <div>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Hard">Hard Only</option>
            </select>
          </div>

        </div>

        {/* Sub-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            
            {/* Review Schedule Toggle */}
            <button
              onClick={() => setReviewFilter(reviewFilter === 'Pending' ? 'All' : 'Pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                reviewFilter === 'Pending' 
                  ? 'bg-primary/20 text-primary border-primary/30' 
                  : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              Pending Review (Due)
            </button>

            {/* Completed Toggle */}
            <button
              onClick={() => setReviewFilter(reviewFilter === 'Completed' ? 'All' : 'Completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                reviewFilter === 'Completed' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              Mastered (Stage 3+)
            </button>

            {/* Favorite Filter Toggle */}
            <button
              onClick={() => setFavoriteFilter(!favoriteFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition ${
                favoriteFilter 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                  : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              Starred Cards
            </button>
          </div>

          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Showing {displayedCards.length} of {filteredCards.length} cards
          </span>
        </div>
      </div>

      {/* Cards List Grid */}
      {filteredCards.length === 0 ? (
        <div className="glass p-16 rounded-3xl border-white/5 text-center max-w-xl mx-auto">
          <Bookmark className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg">No Matching Flashcards</h3>
          <p className="text-slate-400 text-xs mt-1">Try resetting your search terms, modifying your filters, or generate new cards in the AI Generator workspace.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {displayedCards.map(card => (
            <div key={card.id} className="space-y-2.5">
              <FlashcardComponent
                card={card}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDeleteCard}
                onSaveNotes={handleSaveNotes}
                savedNotes={cardNotes[card.id]}
                onEdit={(c) => {
                  setEditingCard(c);
                  setEditQuestion(c.question);
                  setEditAnswer(c.answer);
                  setEditExplanation(c.explanation || '');
                  setEditDifficulty(c.difficulty);
                }}
              />
              
              {/* Extra action bar per card in listing */}
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Due: {new Date(card.review_date).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicateCard(card)}
                    className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      setMovingCard(card);
                      setTargetSubjectId(card.subject_id || 'null');
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <FolderInput className="h-3 w-3" />
                    Move to
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>

          {filteredCards.length > displayLimit && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setDisplayLimit(prev => prev + 12)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/5 shadow-lg transition"
              >
                Load More Cards
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editing Dialog Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingCard(null)} />
          <div className="relative w-full max-w-md glass rounded-3xl border-white/10 shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-white text-lg border-b border-white/5 pb-2">Edit Flashcard</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Question (Front)</label>
                <textarea
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-primary transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Answer (Back)</label>
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-primary transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Explanation (Optional)</label>
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-primary transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Difficulty</label>
                <select
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 border border-white/5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow shadow-primary/20 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moving Card Dialog Modal */}
      {movingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMovingCard(null)} />
          <div className="relative w-full max-w-sm glass rounded-3xl border-white/10 shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-white text-md">Move Flashcard to Subject</h3>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Target Subject</label>
              <select
                value={targetSubjectId}
                onChange={(e) => setTargetSubjectId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-300 outline-none focus:border-primary transition"
              >
                <option value="null">Unassigned (General)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setMovingCard(null)}
                className="px-4 py-2 border border-white/5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveCard}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow transition"
              >
                Move Card
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
