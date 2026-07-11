// AI Integration Service using NVIDIA DeepSeek NIM API

const API_KEY = process.env.DEEPSEEK_API_KEY || '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODELS = [
  'deepseek-ai/deepseek-v4-flash',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.1-8b-instruct'
];

// Helper to execute AI fetch with retry logic and fallback models
async function callDeepSeekWithRetry(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  responseFormatJson = false,
  retries = 2,
  delayMs = 1000
): Promise<string> {
  // Loop through fallback models
  for (const model of MODELS) {
    let attempt = 0;
    while (attempt < retries) {
      try {
        console.log(`Querying AI model: ${model} (attempt ${attempt + 1})`);
        
        const response = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            // Only provide response_format if requested, but some fallbacks might not support it
            response_format: responseFormatJson ? { type: 'json_object' } : undefined,
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(120000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`NVIDIA API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response received from NVIDIA API');
        }

        return content;
      } catch (error: any) {
        attempt++;
        console.warn(`AI request with ${model} attempt ${attempt} failed: ${error?.message || error}`);
        
        // If this is the last attempt for this model, break out to try the next fallback model
        if (attempt >= retries) {
          console.warn(`All attempts failed for model ${model}. Moving to fallback model...`);
          break;
        }
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw new Error('AI generation failed. All NVIDIA inference models are currently overloaded. Please try again in a few moments.');
}

// Clean helper to extract JSON if the model returns markdown codeblocks or conversational prefix/suffix
function extractJsonString(rawContent: string): string {
  let cleanStr = rawContent.trim();
  
  // Strip markdown json fence if present
  if (cleanStr.startsWith('```json')) {
    cleanStr = cleanStr.substring(7);
  } else if (cleanStr.startsWith('```')) {
    cleanStr = cleanStr.substring(3);
  }
  if (cleanStr.endsWith('```')) {
    cleanStr = cleanStr.substring(0, cleanStr.length - 3);
  }
  
  cleanStr = cleanStr.trim();

  // Find the boundaries of the JSON block (either object or array)
  const firstBrace = Math.min(
    cleanStr.indexOf('{') === -1 ? Infinity : cleanStr.indexOf('{'),
    cleanStr.indexOf('[') === -1 ? Infinity : cleanStr.indexOf('[')
  );
  const lastBrace = Math.max(
    cleanStr.lastIndexOf('}'),
    cleanStr.lastIndexOf(']')
  );

  if (firstBrace !== Infinity && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleanStr.substring(firstBrace, lastBrace + 1);
  }
  
  return cleanStr;
}

/**
 * Service methods matching required Edge Function behaviors
 */
export const AIService = {
  /**
   * 1. Generate Flashcards from notes/materials
   */
  async generateFlashcards(
    content: string,
    options: {
      count: number;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      style: 'Question Answer' | 'Definition' | 'Fill in Blank' | 'True False' | 'Multiple Choice' | 'Concept Summary';
      language: string;
    }
  ) {
    const prompt = `You are an expert teacher.
Analyze the student's study materials carefully and generate high-quality educational flashcards.

Style details to follow:
- Question Answer: Standard Q&A structure.
- Definition: Front lists the term, Back provides the detailed definition.
- Fill in Blank: Front contains a sentence with '_____' in place of a keyword. Back lists the correct word.
- True False: Front is a statement. Back is "True" or "False" followed by a short explanation.
- Multiple Choice: Front lists a question with options (A, B, C, D). Back lists the correct answer option and rationale.
- Concept Summary: Front names a complex concept. Back summarizes it in key bullet points.

Requirements:
1. Return ONLY valid JSON matching the schema below.
2. Avoid duplicates.
3. Keep answers concise, clear, and easy to memorize.
4. Set difficulty strictly to "${options.difficulty}".
5. Generate exactly ${options.count} cards if possible (minimum 5, maximum 50).
6. Create educational content suitable for exams and studying.
7. Set relevant tags and auto-detect subject and topic from the material.
8. Output the language in: "${options.language}".

Expected JSON Schema format (Do NOT add markdown fences, return RAW JSON):
{
  "flashcards": [
    {
      "question": "Front of the card content here",
      "answer": "Back of the card content here",
      "explanation": "Brief explanation or mnemonic to help remember the card",
      "difficulty": "${options.difficulty}",
      "tags": ["tag1", "tag2"],
      "subject": "Main Subject Category",
      "topic": "Specific Topic Name"
    }
  ]
}`;

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: `Here is the student's study material:\n\n${content}` },
    ];

    const raw = await callDeepSeekWithRetry(messages, 0.4, true);
    const cleanJson = extractJsonString(raw);
    
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI Flashcards JSON. Raw content:', raw);
      throw new Error('AI returned malformed JSON structure. Please retry.');
    }
  },

  /**
   * 2. Generate Summary of notes
   */
  async generateSummary(content: string, language = 'English') {
    const messages = [
      {
        role: 'system',
        content: `You are an expert study assistant. Provide a highly organized, bulleted educational summary of the student's notes.
Use clean Markdown headers, lists, and bold terms. Avoid fluff. Include key definitions, formulas, or takeaways.
Write the summary in language: "${language}".`,
      },
      { role: 'user', content: `Notes to summarize:\n\n${content}` },
    ];

    return await callDeepSeekWithRetry(messages, 0.3, false);
  },

  /**
   * 3. Generate structured Quiz from flashcards list
   */
  async generateQuiz(
    flashcards: Array<{ question: string; answer: string; explanation?: string }>,
    options: { count: number; difficulty: string }
  ) {
    const prompt = `You are an expert assessment generator. 
Generate a comprehensive, structured multiple-choice, true/false, or fill-in-the-blank quiz from the provided flashcards.

Requirements:
- Create exactly ${options.count} questions.
- Distribute question types: Multiple Choice (MCQ), True/False (T/F), and Fill in the Blank.
- Return ONLY valid JSON matching the schema below.
- Questions should test understanding, not just rote memorization.

Expected JSON Schema format:
{
  "questions": [
    {
      "id": 1,
      "type": "MCQ", -- "MCQ" | "True/False" | "Fill Blank"
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"], -- only for MCQ, otherwise empty array
      "correctAnswer": "The correct answer text",
      "explanation": "Explanation why this is correct"
    }
  ]
}`;

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: `Flashcards to build quiz from:\n\n${JSON.stringify(flashcards)}` },
    ];

    const raw = await callDeepSeekWithRetry(messages, 0.3, true);
    const cleanJson = extractJsonString(raw);

    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI Quiz JSON:', raw);
      throw new Error('AI returned malformed Quiz JSON structure.');
    }
  },

  /**
   * 4. Explain concept, word or question in detail
   */
  async explainConcept(concept: string, context = '', language = 'English') {
    const messages = [
      {
        role: 'system',
        content: `You are an expert tutor. Break down and explain the concept, question, or term in a simple, easy-to-understand student-friendly format.
Use analogies, clear examples, and structured Markdown formatting.
Provide a summary at the start, followed by "Why it works" or "How it works", and then a mnemonic or helper tip.
Write in language: "${language}".`,
      },
      {
        role: 'user',
        content: `Concept to explain: "${concept}".${context ? ` Additional context: ${context}` : ''}`,
      },
    ];

    return await callDeepSeekWithRetry(messages, 0.4, false);
  },

  /**
   * 5. Generate Study Plan
   */
  async generateStudyPlan(
    subjects: string[],
    dailyGoalMinutes = 30,
    weeks = 4,
    language = 'English'
  ) {
    const messages = [
      {
        role: 'system',
        content: `You are an academic coach. Build a customized weekly study plan for a student based on their subjects.
Requirements:
- Target study time: ${dailyGoalMinutes} minutes per day.
- Project schedule for ${weeks} weeks.
- Provide study tips, review sessions (mention spaced repetition), and milestones.
- Format with clean Markdown tables for each week.
- Write in language: "${language}".`,
      },
      {
        role: 'user',
        content: `Subjects list: ${subjects.join(', ')}`,
      },
    ];

    return await callDeepSeekWithRetry(messages, 0.5, false);
  },

  /**
   * 6. Translate Flashcards
   */
  async translateFlashcards(
    flashcards: Array<{ question: string; answer: string; explanation?: string; tags?: string[] }>,
    targetLanguage: string
  ) {
    const prompt = `You are a professional translator. Translate the provided list of flashcards (including questions, answers, and explanations) into the target language.
Maintain the exact technical meaning, difficulty level, and format.
Return ONLY valid JSON matching the schema below.

Target Language: "${targetLanguage}"

Expected JSON Schema format:
{
  "flashcards": [
    {
      "question": "Translated question",
      "answer": "Translated answer",
      "explanation": "Translated explanation"
    }
  ]
}`;

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: `Flashcards to translate:\n\n${JSON.stringify(flashcards)}` },
    ];

    const raw = await callDeepSeekWithRetry(messages, 0.3, true);
    const cleanJson = extractJsonString(raw);

    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI Translation JSON:', raw);
      throw new Error('AI returned malformed Translation JSON structure.');
    }
  },
};
