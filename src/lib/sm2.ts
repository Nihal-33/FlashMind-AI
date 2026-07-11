/**
 * Calculates the next study schedule for a flashcard using the SM-2 Spaced Repetition Algorithm.
 * 
 * Quality ratings (0-5):
 * 5: "Easy" - perfect response
 * 4: "Good" - correct response after a hesitation
 * 3: "Hard" - correct response recalled with serious difficulty
 * 2: "Again" - incorrect response; where the correct one seemed easy to recall
 * 1: "Again" - incorrect response; the correct one was remembered
 * 0: "Again" - complete blackout
 * 
 * Ratings 3-5 are considered successful. Ratings 0-2 reset repetitions.
 */
export interface SM2Input {
  repetitions: number;
  interval: number; // in days
  easeFactor: number;
}

export interface SM2Output {
  repetitions: number;
  interval: number;
  easeFactor: number;
  reviewDate: Date;
}

export function calculateSM2(
  quality: number, // 0 to 5
  previous: SM2Input
): SM2Output {
  let repetitions = previous.repetitions;
  let interval = previous.interval;
  let easeFactor = previous.easeFactor;

  // Adjust ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Determine interval and repetitions
  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Calculate next review date
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    reviewDate,
  };
}

/**
 * Maps standard UI actions (Again, Hard, Good, Easy) to SM-2 quality scores (0-5)
 */
export function getSM2Quality(rating: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (rating) {
    case 'again': return 1; // Incorrect, reset repetitions
    case 'hard': return 3;  // Correct, but difficult
    case 'good': return 4;  // Correct with minor hesitation
    case 'easy': return 5;  // Perfect recall
  }
}
