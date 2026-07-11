import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, count = 10, difficulty = 'Medium', style = 'Question Answer', language = 'English' } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content string' }, { status: 400 });
    }

    const result = await AIService.generateFlashcards(content, {
      count: Number(count),
      difficulty,
      style,
      language
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/generate-flashcards:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
