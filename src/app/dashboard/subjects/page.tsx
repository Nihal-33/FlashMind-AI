'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  FolderPlus, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Folder, 
  BookOpen, 
  GraduationCap, 
  Compass, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  FolderClosed,
  Palette,
  Check
} from 'lucide-react';

interface Subject {
  id: string;
  title: string;
  color: string;
  icon: string;
  card_count?: number;
}

interface Topic {
  id: string;
  subject_id: string;
  title: string;
  card_count?: number;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4F46E5');
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [newTopicTitles, setNewTopicTitles] = useState<Record<string, string>>({});
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Colors list
  const colors = [
    '#4F46E5', // Indigo
    '#7C3AED', // Violet
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
  ];

  // Icons list
  const icons = [
    { name: 'BookOpen', label: 'Book' },
    { name: 'Folder', label: 'Folder' },
    { name: 'GraduationCap', label: 'Cap' },
    { name: 'Compass', label: 'Compass' },
  ];

  // Fetch subjects and topics
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Subjects
      const { data: subData, error: subError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (subError) throw subError;

      // 2. Fetch Topics for all subjects
      const subjectsList = subData as Subject[];
      const topicsMap: Record<string, Topic[]> = {};
      
      if (subjectsList.length > 0) {
        const subIds = subjectsList.map(s => s.id);
        const { data: topData, error: topError } = await supabase
          .from('topics')
          .select('*')
          .in('subject_id', subIds);

        if (topError) throw topError;

        // Group topics by subject_id
        const allTopics = topData as Topic[];
        allTopics.forEach(t => {
          if (!topicsMap[t.subject_id]) topicsMap[t.subject_id] = [];
          topicsMap[t.subject_id].push(t);
        });
      }

      // 3. Get Card Counts for subjects & topics
      const { data: cardData, error: cardError } = await supabase
        .from('flashcards')
        .select('subject_id, topic_id')
        .eq('user_id', user.id);

      if (!cardError && cardData) {
        // Count cards for subjects
        const subCounts: Record<string, number> = {};
        const topCounts: Record<string, number> = {};

        cardData.forEach(c => {
          if (c.subject_id) subCounts[c.subject_id] = (subCounts[c.subject_id] || 0) + 1;
          if (c.topic_id) topCounts[c.topic_id] = (topCounts[c.topic_id] || 0) + 1;
        });

        // Map card counts back to subjects
        const updatedSubjects = subjectsList.map(s => ({
          ...s,
          card_count: subCounts[s.id] || 0
        }));

        // Map card counts back to topics
        Object.keys(topicsMap).forEach(subId => {
          topicsMap[subId] = topicsMap[subId].map(t => ({
            ...t,
            card_count: topCounts[t.id] || 0
          }));
        });

        setSubjects(updatedSubjects);
      } else {
        setSubjects(subjectsList);
      }

      setTopics(topicsMap);
    } catch (err) {
      console.error('Error fetching subjects/topics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectTitle.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          title: newSubjectTitle,
          color: selectedColor,
          icon: selectedIcon
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, { ...data, card_count: 0 }]);
      setNewSubjectTitle('');
    } catch (err) {
      console.error('Error creating subject:', err);
    }
  };

  // Toggle Subject Expand
  const toggleExpand = (subId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  // Create Topic
  const handleCreateTopic = async (subId: string) => {
    const title = newTopicTitles[subId];
    if (!title?.trim()) return;

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          subject_id: subId,
          title: title
        })
        .select()
        .single();

      if (error) throw error;

      setTopics(prev => ({
        ...prev,
        [subId]: [...(prev[subId] || []), { ...data, card_count: 0 }]
      }));

      setNewTopicTitles(prev => ({ ...prev, [subId]: '' }));
      // Ensure subject is expanded
      setExpandedSubjects(prev => ({ ...prev, [subId]: true }));
    } catch (err) {
      console.error('Error creating topic:', err);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subId: string) => {
    if (!confirm('Are you sure you want to delete this subject? All nested topics and flashcards will be lost.')) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subId);

      if (error) throw error;
      setSubjects(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      console.error('Error deleting subject:', err);
    }
  };

  // Delete Topic
  const handleDeleteTopic = async (subId: string, topicId: string) => {
    if (!confirm('Delete this topic? Cards inside this topic will remain in the subject but lose topic categorization.')) return;
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      setTopics(prev => ({
        ...prev,
        [subId]: prev[subId].filter(t => t.id !== topicId)
      }));
    } catch (err) {
      console.error('Error deleting topic:', err);
    }
  };

  // Edit Subject Name
  const handleSaveSubjectEdit = async () => {
    if (!editingSubject || !editTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ title: editTitle })
        .eq('id', editingSubject.id);

      if (error) throw error;

      setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, title: editTitle } : s));
      setEditingSubject(null);
    } catch (err) {
      console.error('Error saving subject edit:', err);
    }
  };

  // Edit Topic Name
  const handleSaveTopicEdit = async () => {
    if (!editingTopic || !editTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('topics')
        .update({ title: editTitle })
        .eq('id', editingTopic.id);

      if (error) throw error;

      setTopics(prev => ({
        ...prev,
        [editingTopic.subject_id]: prev[editingTopic.subject_id].map(t => 
          t.id === editingTopic.id ? { ...t, title: editTitle } : t
        )
      }));
      setEditingTopic(null);
    } catch (err) {
      console.error('Error saving topic edit:', err);
    }
  };

  const renderSubjectIcon = (iconName: string, color: string) => {
    const props = { className: "h-5 w-5", style: { color } };
    switch (iconName) {
      case 'Folder': return <Folder {...props} />;
      case 'GraduationCap': return <GraduationCap {...props} />;
      case 'Compass': return <Compass {...props} />;
      default: return <BookOpen {...props} />;
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Subject Organization</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your course subjects, syllabus chapters, and topic folders.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Create Subject Panel */}
        <div className="glass p-6 rounded-2xl border-white/5 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <FolderPlus className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-white">Create Subject</h2>
          </div>

          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
                placeholder="e.g. Organic Chemistry"
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition"
              />
            </div>

            {/* Colors picker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Color Tag
              </label>
              <div className="flex flex-wrap gap-2.5">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className="h-6 w-6 rounded-full flex items-center justify-center border border-slate-950 transition hover:scale-105 active:scale-95"
                  >
                    {selectedColor === color && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons picker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Icon Representation
              </label>
              <div className="grid grid-cols-4 gap-2">
                {icons.map(icon => {
                  const active = selectedIcon === icon.name;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`py-2 rounded-lg border flex flex-col items-center gap-1 transition ${
                        active 
                          ? 'border-primary bg-primary/10 text-white' 
                          : 'border-white/5 bg-slate-800/40 text-slate-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {renderSubjectIcon(icon.name, active ? selectedColor : '#94A3B8')}
                      <span className="text-[9px] font-semibold">{icon.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              Add Subject Folder
            </button>
          </form>
        </div>

        {/* Right Side: Tree Tree list */}
        <div className="lg:col-span-2 space-y-4">
          
          {subjects.length === 0 ? (
            <div className="glass p-12 rounded-2xl border-white/5 text-center text-slate-400">
              <FolderClosed className="h-12 w-12 mx-auto text-slate-600 mb-3" />
              <h3 className="font-bold text-white text-md">No Subjects Created</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Create a subject on the left to start organizing your flashcard collections.</p>
            </div>
          ) : (
            subjects.map(subject => {
              const expanded = expandedSubjects[subject.id];
              const subTopics = topics[subject.id] || [];
              const topicInputValue = newTopicTitles[subject.id] || '';

              return (
                <div key={subject.id} className="glass rounded-2xl border-white/5 overflow-hidden">
                  
                  {/* Subject Header */}
                  <div className="p-4 flex items-center justify-between bg-slate-800/20 border-b border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <button 
                        onClick={() => toggleExpand(subject.id)}
                        className="p-1 rounded hover:bg-white/5 text-slate-400"
                      >
                        {expanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
                      </button>
                      <div className="flex items-center gap-2">
                        {renderSubjectIcon(subject.icon, subject.color)}
                        <span className="font-bold text-white text-sm md:text-base leading-tight truncate">{subject.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-semibold border border-white/5 shrink-0">
                        {subject.card_count} cards
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Subject */}
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setEditTitle(subject.title);
                        }}
                        className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-white transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {/* Delete Subject */}
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Nested Content (Topics list) */}
                  {expanded && (
                    <div className="p-4 bg-slate-950/20 space-y-3.5">
                      
                      {/* Add Topic Inline Form */}
                      <div className="flex items-center gap-2 pl-6">
                        <input
                          type="text"
                          value={topicInputValue}
                          onChange={(e) => setNewTopicTitles(prev => ({ ...prev, [subject.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateTopic(subject.id);
                          }}
                          placeholder="Create nested topic / chapter... (Press Enter)"
                          className="flex-grow px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-xs text-white outline-none transition"
                        />
                        <button
                          onClick={() => handleCreateTopic(subject.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs border border-white/5 flex items-center gap-1 transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>

                      {/* Topics tree list */}
                      <div className="space-y-1.5 pl-6">
                        {subTopics.length === 0 ? (
                          <p className="text-slate-500 text-xs italic pl-2.5 py-1">No nested topics in this subject yet.</p>
                        ) : (
                          subTopics.map(topic => (
                            <div 
                              key={topic.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/10 hover:bg-slate-800/40 border border-white/5 transition"
                            >
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-slate-500" />
                                <span className="text-xs text-slate-300 font-medium leading-none">{topic.title}</span>
                                <span className="text-[9px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 font-semibold">
                                  {topic.card_count} cards
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTopic(topic);
                                    setEditTitle(topic.title);
                                  }}
                                  className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTopic(subject.id, topic.id)}
                                  className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editing Dialog Modal - Subject */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingSubject(null)} />
          <div className="relative w-full max-w-sm glass rounded-2xl border-white/10 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
              <Edit3 className="h-4.5 w-4.5 text-primary" />
              Edit Subject Name
            </h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingSubject(null)}
                className="px-4 py-2 border border-white/5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSubjectEdit}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Dialog Modal - Topic */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingTopic(null)} />
          <div className="relative w-full max-w-sm glass rounded-2xl border-white/10 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
              <Edit3 className="h-4.5 w-4.5 text-primary" />
              Edit Topic Name
            </h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingTopic(null)}
                className="px-4 py-2 border border-white/5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTopicEdit}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
