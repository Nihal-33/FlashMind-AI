import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FlashMind AI - Learn Faster with AI Generated Flashcards',
  description: 'Upload your notes, PDFs, or simply enter any topic and let AI generate smart flashcards automatically. Study using quizzes and spaced repetition.',
  keywords: ['flashcards', 'AI flashcard generator', 'spaced repetition', 'SM-2 algorithm', 'Quizlet alternative', 'Notion study cards', 'exam prep'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
