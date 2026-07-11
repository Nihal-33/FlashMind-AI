import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, language = 'English' } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content string' }, { status: 400 });
    }

    const summary = await AIService.generateSummary(content, language);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error in /api/generate-summary:', error);
    return NextResponse.json({ error: error.message || 'Summary generation failed' }, { status: 500 });
  }
}
