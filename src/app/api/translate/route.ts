import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { flashcards, targetLanguage = 'English' } = body;

    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid flashcards array' }, { status: 400 });
    }

    const result = await AIService.translateFlashcards(flashcards, targetLanguage);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/translate:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
