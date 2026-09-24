import type { Question } from "./types";

export interface ValidationReport {
  ok: boolean;
  expected: number;
  count: number;
  uniqueNumbers: number;
  duplicateNumbers: number[];
  missingNumbers: number[];
  outOfRange: number[];
  missingQuestionText: number[];
  missingChoices: number[];
  emptyChoices: number[];
  missingAnswers: number[];
  invalidAnswers: number[];
  twoAnswerQuestions: number[];
  missingImageFiles: { number: number; src: string }[];
  questionsWithImages: number[];
  imagesExpectedButMissing: number[];
  missingExternalMedia: { number: number; type: string }[];
  errors: string[];
}

/**
 * Validate the imported bank.
 * `imageExists` is injected so the same logic works in Node (fs) and in tests.
 */
export function validateQuestions(
  questions: Question[],
  imageExists: (src: string) => boolean,
  expected = 1000,
): ValidationReport {
  const seen = new Map<number, number>();
  for (const q of questions) seen.set(q.number, (seen.get(q.number) ?? 0) + 1);

  const r: ValidationReport = {
    ok: true,
    expected,
    count: questions.length,
    uniqueNumbers: seen.size,
    duplicateNumbers: [...seen].filter(([, c]) => c > 1).map(([n]) => n),
    missingNumbers: [],
    outOfRange: [...seen.keys()].filter((n) => !Number.isInteger(n) || n < 1 || n > expected),
    missingQuestionText: [],
    missingChoices: [],
    emptyChoices: [],
    missingAnswers: [],
    invalidAnswers: [],
    twoAnswerQuestions: [],
    missingImageFiles: [],
    questionsWithImages: [],
    imagesExpectedButMissing: [],
    missingExternalMedia: [],
    errors: [],
  };

  for (let n = 1; n <= expected; n++) if (!seen.has(n)) r.missingNumbers.push(n);

  for (const q of questions) {
    if (!q.question?.trim()) r.missingQuestionText.push(q.number);
    if (!Array.isArray(q.choices) || q.choices.length < 4) r.missingChoices.push(q.number);
    if (q.choices?.some((c) => !c?.trim())) r.emptyChoices.push(q.number);
    if (!Array.isArray(q.answers) || q.answers.length === 0) r.missingAnswers.push(q.number);
    else if (
      q.answers.length > 2 ||
      new Set(q.answers).size !== q.answers.length ||
      q.answers.some((a) => !Number.isInteger(a) || a < 1 || a > q.choices.length)
    )
      r.invalidAnswers.push(q.number);
    if (q.answers?.length === 2) r.twoAnswerQuestions.push(q.number);
    if (q.images.length > 0) r.questionsWithImages.push(q.number);
    for (const img of q.images) if (!imageExists(img.src)) r.missingImageFiles.push({ number: q.number, src: img.src });
    // Photo/illustration and sign questions must carry their picture.
    if ((q.kind === "picture" || q.kind === "situation") && q.images.length === 0) r.imagesExpectedButMissing.push(q.number);
    if (q.missingMedia) r.missingExternalMedia.push({ number: q.number, type: q.missingMedia.type });
  }

  const fail = (cond: boolean, msg: string) => {
    if (cond) r.errors.push(msg);
  };
  fail(r.count !== expected, `Expected ${expected} questions, found ${r.count}`);
  fail(r.uniqueNumbers !== expected, `Expected ${expected} unique numbers, found ${r.uniqueNumbers}`);
  fail(r.duplicateNumbers.length > 0, `Duplicate numbers: ${r.duplicateNumbers.join(", ")}`);
  fail(r.missingNumbers.length > 0, `Missing numbers: ${r.missingNumbers.join(", ")}`);
  fail(r.outOfRange.length > 0, `Numbers out of range: ${r.outOfRange.join(", ")}`);
  fail(r.missingQuestionText.length > 0, `Missing question text: ${r.missingQuestionText.join(", ")}`);
  fail(r.missingChoices.length > 0, `Fewer than 4 choices: ${r.missingChoices.join(", ")}`);
  fail(r.emptyChoices.length > 0, `Empty choice text: ${r.emptyChoices.join(", ")}`);
  fail(r.missingAnswers.length > 0, `Missing answers: ${r.missingAnswers.join(", ")}`);
  fail(r.invalidAnswers.length > 0, `Invalid answers: ${r.invalidAnswers.join(", ")}`);
  fail(r.missingImageFiles.length > 0, `Image files missing on disk: ${r.missingImageFiles.map((m) => m.number).join(", ")}`);
  fail(r.imagesExpectedButMissing.length > 0, `Picture questions without an image: ${r.imagesExpectedButMissing.join(", ")}`);
  r.ok = r.errors.length === 0;
  return r;
}

/** Collapse a sorted list of numbers into "1–5, 8, 10–12". */
export function ranges(nums: number[]): string {
  const s = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return out.join(", ");
}
