import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { concept, context = '', language = 'English' } = body;

    if (!concept || typeof concept !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid concept string' }, { status: 400 });
    }

    const explanation = await AIService.explainConcept(concept, context, language);
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error('Error in /api/explain:', error);
    return NextResponse.json({ error: error.message || 'Explanation failed' }, { status: 500 });
  }
}
