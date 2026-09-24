import data from "../../data/questions.json";
import type { Question, QuestionKind } from "./types";

export const QUESTIONS: Question[] = data as Question[];

const byNumber = new Map(QUESTIONS.map((q) => [q.number, q]));

export function getQuestion(n: number): Question | undefined {
  return byNumber.get(n);
}

export const TOTAL_QUESTIONS = QUESTIONS.length;

export const KIND_LABELS: Record<QuestionKind, string> = {
  text: "Text",
  picture: "Sign / picture",
  situation: "Photo / illustration",
  video: "Video",
};

export function isTwoAnswer(q: Question): boolean {
  return q.answers.length === 2;
}

/** True when the question can be answered fairly with only the PDF content. */
export function isAnswerable(q: Question): boolean {
  return q.missingMedia === null;
}

export function searchQuestions(list: Question[], query: string): Question[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return list;
  return list.filter((q) => {
    const haystack = [String(q.number), q.question, ...q.choices, ...q.notes].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
