import type { Question, Selection } from "./types";

/**
 * A response is correct only when the selected set exactly equals the answer set.
 * For two-answer questions both answers must be chosen and nothing else (no partial credit),
 * matching how the official test scores them.
 */
export function isCorrect(q: Pick<Question, "answers">, selected: Selection | undefined): boolean {
  if (!selected || selected.length !== q.answers.length) return false;
  const want = new Set(q.answers);
  return new Set(selected).size === selected.length && selected.every((s) => want.has(s));
}

/** Selection is complete once the user picked as many options as the question needs. */
export function isComplete(q: Pick<Question, "answers">, selected: Selection | undefined): boolean {
  return (selected?.length ?? 0) === q.answers.length;
}

/**
 * Toggle an option. Clicking a selected option deselects it.
 * When the question already has its required number of picks, a new pick is ignored,
 * so a two-answer question can never hold three selections.
 */
export function toggleSelection(q: Pick<Question, "answers">, selected: Selection | undefined, choice: number): Selection {
  const cur = selected ?? [];
  if (cur.includes(choice)) return cur.filter((c) => c !== choice);
  if (q.answers.length === 1) return [choice];
  if (cur.length >= q.answers.length) return cur;
  return [...cur, choice].sort((a, b) => a - b);
}

export interface ExamItem {
  number: number;
  points: number;
}

export interface ExamScore {
  earned: number;
  possible: number;
  /** Score out of 100 (scaled when the exam has fewer than 100 possible points). */
  score: number;
  correct: number;
  answered: number;
  total: number;
  passed: boolean;
  passMark: number;
}

export function scoreExam(
  items: ExamItem[],
  questions: Map<number, Pick<Question, "answers">>,
  responses: Record<number, Selection>,
  passMark: number,
): ExamScore {
  let earned = 0;
  let possible = 0;
  let correct = 0;
  let answered = 0;
  for (const item of items) {
    const q = questions.get(item.number);
    if (!q) throw new Error(`Unknown question ${item.number}`);
    possible += item.points;
    const sel = responses[item.number];
    if (sel && sel.length > 0) answered++;
    if (isCorrect(q, sel)) {
      earned += item.points;
      correct++;
    }
  }
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 1000) / 10;
  return { earned, possible, score, correct, answered, total: items.length, passed: score >= passMark, passMark };
}
