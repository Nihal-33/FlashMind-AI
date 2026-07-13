'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  BrainCircuit, 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  Sparkles, 
  HelpCircle, 
  PlayCircle, 
  BarChart2, 
  User as UserIcon, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Search,
  Flame,
  Award,
  Loader2,
  ChevronRight,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/context/theme-context';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Route Protection
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Handle global search
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2 || !user) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('flashcards')
          .select('*, subjects(title)')
          .eq('user_id', user.id)
          .or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%,explanation.ilike.%${searchQuery}%`)
          .limit(5);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (!error) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (!error) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const subscription = supabase
        .channel(`public:notifications:${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const menuItems: SidebarItem[] = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <BookOpen className="h-5 w-5" />, label: 'Subjects', href: '/dashboard/subjects' },
    { icon: <Layers className="h-5 w-5" />, label: 'Flashcards', href: '/dashboard/flashcards' },
    { icon: <Sparkles className="h-5 w-5" />, label: 'AI Generator', href: '/dashboard/generator' },
    { icon: <PlayCircle className="h-5 w-5" />, label: 'Study Mode', href: '/dashboard/study' },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Quiz Mode', href: '/dashboard/quiz' },
    { icon: <BarChart2 className="h-5 w-5" />, label: 'Progress', href: '/dashboard/progress' },
    { icon: <UserIcon className="h-5 w-5" />, label: 'Profile', href: '/dashboard/profile' },
    { icon: <SettingsIcon className="h-5 w-5" />, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-white/5 shrink-0 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-2.5 border-b border-white/5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
            <BrainCircuit className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="logo-text font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            FlashMind <span className="text-primary font-black">AI</span>
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item, idx) => {
            const active = pathname === item.href;
            return (
              <Link 
                key={idx}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-primary uppercase overflow-hidden">
              {profile?.avatar ? (
                <img src={profile.avatar.startsWith('http') ? profile.avatar : `${supabase.storage.from('avatars').getPublicUrl(profile.avatar).data.publicUrl}`} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                profile?.name?.[0] || 'S'
              )}
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-sm font-bold text-white truncate">{profile?.name || 'Student'}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="w-full py-2.5 rounded-lg border border-white/5 hover:border-red-500/30 bg-slate-900 text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 border-r border-white/5 p-4 text-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <span className="logo-text font-bold text-md text-white">FlashMind AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-slate-800 border border-white/5">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <nav className="flex-grow space-y-1">
              {menuItems.map((item, idx) => {
                const active = pathname === item.href;
                return (
                  <Link 
                    key={idx}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                      active ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto pt-4 border-t border-white/5">
              <button 
                onClick={signOut}
                className="w-full py-2 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="h-16 border-b border-white/5 glass sticky top-0 z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded bg-slate-800/80 border border-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search trigger */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:border-white/20 text-xs transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search notes, questions...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-900 text-[10px] border border-white/5">Ctrl+K</kbd>
            </button>
          </div>

          {/* Gamified stats & widgets */}
          <div className="flex items-center gap-5">
            {/* Streak Counter */}
            <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Flame className="h-4 w-4 fill-amber-500 animate-pulse" />
              <span>{profile?.streak || 0}d streak</span>
            </div>

            {/* XP Level */}
            <div className="hidden sm:flex items-center gap-1.5 text-accent font-bold text-xs bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
              <Award className="h-4 w-4" />
              <span>Lvl {profile?.level || 1}</span>
              <span className="text-[10px] text-slate-500 font-normal">({profile?.xp || 0} XP)</span>
            </div>

            {/* Day/Night Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:text-white transition"
              title="Toggle Day/Night Mode"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Notifications panel toggle */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg border border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:text-slate-200 transition relative"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 glass border border-slate-700/30 dark:border-white/10 shadow-2xl rounded-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center px-4 pb-2.5 border-b border-slate-700/10 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Notifications ({unreadCount})</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead} 
                          className="text-[10px] text-primary hover:text-primary-hover font-semibold transition"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto no-scrollbar py-1">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-500">
                          No new notifications.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              markAsRead(n.id);
                              setNotificationsOpen(false);
                            }}
                            className={`px-4 py-3 border-b border-slate-700/5 dark:border-white/5 last:border-none text-left cursor-pointer transition ${
                              n.read ? 'hover:bg-slate-100/50 dark:hover:bg-white/5 opacity-60' : 'bg-primary/5 hover:bg-primary/10'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`text-xs font-bold ${n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{n.title}</span>
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1" />}
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{n.content}</p>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-1.5">
                              {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Inner Page View */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-6">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-lg glass rounded-2xl border-white/10 shadow-2xl p-4 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center border-b border-white/5 pb-3 mb-4">
              <Search className="h-5 w-5 text-slate-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 border-none outline-none text-sm"
              />
              <button onClick={() => setSearchOpen(false)} className="p-1 rounded bg-slate-800/80 hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {searching ? (
                <div className="py-8 flex justify-center items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching database...
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <p className="text-center py-6 text-xs text-slate-500">Please enter at least 2 characters to search.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">No matching flashcards found.</p>
              ) : (
                searchResults.map((card) => (
                  <div 
                    key={card.id}
                    onClick={() => {
                      setSearchOpen(false);
                      router.push('/dashboard/flashcards');
                    }}
                    className="p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-white/5 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">
                        {card.subjects?.title || 'General'}
                      </p>
                      <p className="text-sm text-white font-semibold truncate leading-tight">{card.question}</p>
                      <p className="text-xs text-slate-400 truncate mt-1">{card.answer}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
