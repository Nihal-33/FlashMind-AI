'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, 
  Upload, 
  Sparkles, 
  BookOpen, 
  Flame, 
  TrendingUp, 
  Play, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  MessageSquare,
  Zap,
  Shield,
  Layers
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function LandingPage() {
  const { user } = useAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: <Upload className="h-6 w-6 text-accent" />,
      title: "Multi-Format Import",
      desc: "Upload PDFs, DOCX, TXT notes, images (OCR), or paste plain text. Let the AI parse and digest it."
    },
    {
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      title: "Generative AI Engine",
      desc: "Powered by DeepSeek on NVIDIA NIM, generating high-quality exam-ready cards in multiple styles."
    },
    {
      icon: <Layers className="h-6 w-6 text-secondary" />,
      title: "SM-2 Spaced Repetition",
      desc: "Scientific scheduler schedules reviews based on your recall. Retain 90%+ of what you learn."
    },
    {
      icon: <BrainCircuit className="h-6 w-6 text-accent" />,
      title: "Adaptive Quizzes",
      desc: "Convert flashcards into custom multiple choice, true/false, or fill-in-the-blank quizzes dynamically."
    },
    {
      icon: <Flame className="h-6 w-6 text-primary" />,
      title: "Gamified Study Streaks",
      desc: "Earn XP, unlock level badges, and maintain your daily streak to build a consistent study habit."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-secondary" />,
      title: "Visual Progress Charts",
      desc: "Track cards mastered, study time, and quiz scores with intuitive, beautifully rendered dashboard charts."
    }
  ];

  const testimonials = [
    {
      quote: "FlashMind AI cut my exam preparation time in half. I just upload my lecture notes, and it builds the perfect Anki-like deck instantly.",
      author: "Sarah K.",
      role: "Medical Student, Harvard"
    },
    {
      quote: "The spaced repetition algorithm is spot-on. I actually remember vocabulary words weeks after studying them.",
      author: "David L.",
      role: "Language Learner"
    },
    {
      quote: "Quizzing myself on cards generated from my PDF textbooks made me ace my computer science finals. Highly recommend!",
      author: "Ananya M.",
      role: "Engineering Undergraduate"
    }
  ];

  const faqs = [
    {
      q: "How does the AI generate the flashcards?",
      a: "Our system analyzes your text, notes, or uploaded files (PDFs, images) using our advanced AI backend. It extracts core definitions, complex concepts, and exam questions, automatically formatting them into front/back cards with helpful explanations."
    },
    {
      q: "What is Spaced Repetition (SM-2)?",
      a: "SM-2 is a cognitive science algorithm that calculates the optimal time to review a card. Based on your rating (Again, Hard, Good, Easy), it schedules reviews just as you are about to forget, maximizing long-term memory retention."
    },
    {
      q: "Can I export my flashcards?",
      a: "Yes! You can export your flashcards into CSV, JSON, Markdown, PDFs, or Anki-compatible decks (`.apkg`) for use on other study platforms."
    },
    {
      q: "Is there support for languages other than English?",
      a: "Absolutely. You can generate or translate flashcards into English, Hindi, Spanish, French, and other languages seamlessly."
    }
  ];

  // Floating card variants for hero section animation
  const floatingCardVariants = {
    animate1: {
      y: [0, -15, 0],
      rotate: [-2, 2, -2],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    animate2: {
      y: [0, 15, 0],
      rotate: [3, -3, 3],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-slate-900 selection:bg-primary/30 selection:text-white">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[45%] h-[45%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FlashMind <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div>
            <Link 
              href={user ? "/dashboard" : "/login"} 
              className="px-5 py-2 rounded-lg text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200 flex items-center gap-1.5 shadow-sm"
            >
              {user ? 'Enter Dashboard' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col space-y-8 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center space-x-2 self-center lg:self-start px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Spaced Repetition</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight"
            >
              Generate AI <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Flashcards in Seconds
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed"
            >
              Upload your notes, PDFs, or simply enter any topic and let AI generate smart flashcards automatically. Learn faster, recall longer, and ace your exams.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link 
                href={user ? "/dashboard" : "/login"}
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                Generate Flashcards
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => alert("Watch Demo: FlashMind AI uses AI to dissect study papers into core flashcards, providing keyboard study triggers and SM-2 feedback. Login to start immediately!")}
                className="w-full sm:w-auto px-8 py-4 border border-white/10 hover:border-white/20 bg-slate-800/50 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4 fill-white text-white" />
                Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Hero Right Visuals (Floating Cards Stack) */}
          <div className="lg:col-span-5 relative flex items-center justify-center h-[400px]">
            {/* Card 1 (Front Concept) */}
            <motion.div 
              variants={floatingCardVariants}
              animate="animate1"
              className="absolute z-10 w-72 glass p-6 rounded-2xl shadow-2xl border-white/10 glow-primary -left-4 sm:left-4"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Concept Card</span>
                <BrainCircuit className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2 leading-snug">Neural Plasticity</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                The ability of the nervous system to change its activity in response to intrinsic or extrinsic stimuli.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-medium">Difficulty: Hard</span>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-semibold">Biology</span>
              </div>
            </motion.div>

            {/* Card 2 (Spaced Repetition Schedule) */}
            <motion.div 
              variants={floatingCardVariants}
              animate="animate2"
              className="absolute z-20 w-64 glass p-5 rounded-2xl shadow-2xl border-white/10 glow-secondary right-4 bottom-8"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">SM-2 Review</span>
                <Flame className="h-4 w-4 text-secondary" />
              </div>
              <p className="text-slate-300 text-xs font-semibold mb-2">Review scheduled in:</p>
              <div className="text-2xl font-black text-white mb-3">6 Days</div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-2">
                <div className="bg-secondary h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Mastery: 85%</span>
                <span>Ease: 2.6x</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Logos or Social Proof banner */}
      <div className="border-t border-b border-white/5 bg-slate-950/20 py-8 px-6 text-center">
        <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-4">Empowering students from leading institutions</p>
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-35 grayscale text-sm font-semibold tracking-wider text-slate-400">
          <span>STANFORD UNIVERSITY</span>
          <span>MIT</span>
          <span>HARVARD MEDICAL</span>
          <span>UC BERKELEY</span>
          <span>OXFORD ACADEMY</span>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-accent">Feature-rich Workspace</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Everything you need to master any subject</h2>
            <p className="text-slate-400">We combine the content generation of ChatGPT, the folder organization of Notion, and the scientific recall methods of Quizlet and Anki.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-2xl border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-800/80 flex items-center justify-center border border-white/10">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-950/20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Success Stories</span>
            <h2 className="text-3xl font-bold text-white">Loved by students worldwide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="glass p-8 rounded-2xl flex flex-col justify-between relative border-white/5">
                <MessageSquare className="absolute top-4 right-4 h-5 w-5 text-slate-700 pointer-events-none" />
                <p className="text-slate-300 text-sm italic leading-relaxed mb-6">"{t.quote}"</p>
                <div>
                  <h4 className="font-bold text-white text-sm">{t.author}</h4>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-secondary">Pricing Plans</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Choose your learning speed</h2>
            <p className="text-slate-400">Unlock full capabilities. Start for free, upgrade when you need to study heavier textbooks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="glass p-8 rounded-3xl border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xl text-white mb-2">Explorer Plan</h3>
                <p className="text-slate-400 text-xs mb-6">Great for casual studying and trying out AI features.</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-500 text-sm ml-2">/ month</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-accent" />
                    5 AI generations per day
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-accent" />
                    Up to 100 total saved flashcards
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-accent" />
                    SM-2 Spaced Repetition reviews
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-accent" />
                    Basic Q&A flashcard styles
                  </li>
                </ul>
              </div>
              <Link 
                href={user ? "/dashboard" : "/login"}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-center font-bold rounded-xl transition"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass p-8 rounded-3xl border-primary/30 relative flex flex-col justify-between glow-primary">
              <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="font-bold text-xl text-white mb-2">Pro Scholar</h3>
                <p className="text-slate-400 text-xs mb-6">For students who want infinite generation and analytics.</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-extrabold text-white">$9.99</span>
                  <span className="text-slate-500 text-sm ml-2">/ month</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-primary" />
                    Unlimited AI card generations
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-primary" />
                    Upload unlimited PDFs, DOCX, & OCR Images
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-primary" />
                    All 6 Flashcard styles & translation
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-primary" />
                    Detailed progress dashboards & streaks
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-primary" />
                    Priority access to DeepSeek models
                  </li>
                </ul>
              </div>
              <Link 
                href={user ? "/dashboard" : "/login"}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-center font-bold rounded-xl shadow-md transition"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 border-t border-white/5 bg-slate-950/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-accent">Got Questions?</span>
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="glass rounded-xl border-white/5 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between text-white font-semibold hover:bg-white/5 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out ${activeFaq === index ? 'max-h-48 border-t border-white/5 py-5 px-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                >
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 text-center border-t border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">Ready to boost your memory retention?</h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto">Join thousands of students and language learners generating cards automatically with FlashMind AI today.</p>
          <div>
            <Link 
              href={user ? "/dashboard" : "/login"}
              className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Start Generating Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 border-t border-white/5 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
              <BrainCircuit className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-300">FlashMind AI</span>
          </div>
          <div>
            <p>&copy; 2026 FlashMind AI. Built with Next.js, Supabase, and DeepSeek. All rights reserved.</p>
          </div>
          <div className="flex space-x-6 text-slate-400 font-medium">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
