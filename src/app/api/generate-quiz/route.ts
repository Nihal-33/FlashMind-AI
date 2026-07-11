import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { flashcards, count = 5, difficulty = 'Medium' } = body;

    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid flashcards array' }, { status: 400 });
    }

    const quiz = await AIService.generateQuiz(flashcards, {
      count: Number(count),
      difficulty,
    });
    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error('Error in /api/generate-quiz:', error);
    return NextResponse.json({ error: error.message || 'Quiz generation failed' }, { status: 500 });
  }
}
