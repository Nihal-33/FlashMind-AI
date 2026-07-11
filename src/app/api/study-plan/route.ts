import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subjects, dailyGoalMinutes = 30, weeks = 4, language = 'English' } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid subjects array' }, { status: 400 });
    }

    const plan = await AIService.generateStudyPlan(subjects, Number(dailyGoalMinutes), Number(weeks), language);
    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('Error in /api/study-plan:', error);
    return NextResponse.json({ error: error.message || 'Study plan generation failed' }, { status: 500 });
  }
}
