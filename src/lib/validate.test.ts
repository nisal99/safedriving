import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "./questions";
import type { Question } from "./types";
import { validateQuestions } from "./validate";

const publicDir = path.resolve(__dirname, "../../public");
const onDisk = (src: string) => existsSync(path.join(publicDir, src));

describe("imported question bank", () => {
  const r = validateQuestions(QUESTIONS, onDisk);

  it("has exactly 1,000 unique question numbers, 1 to 1000 with no gaps", () => {
    expect(r.count).toBe(1000);
    expect(r.uniqueNumbers).toBe(1000);
    expect(r.missingNumbers).toEqual([]);
    expect(r.duplicateNumbers).toEqual([]);
    expect(QUESTIONS.map((q) => q.number)).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1));
  });

  it("has text, choices and valid answers for every question", () => {
    expect(r.missingQuestionText).toEqual([]);
    expect(r.missingChoices).toEqual([]);
    expect(r.emptyChoices).toEqual([]);
    expect(r.missingAnswers).toEqual([]);
    expect(r.invalidAnswers).toEqual([]);
  });

  it("has every image file referenced by a question", () => {
    expect(r.missingImageFiles).toEqual([]);
    expect(r.imagesExpectedButMissing).toEqual([]);
    expect(r.questionsWithImages).toHaveLength(285);
  });

  it("flags the 35 video questions (966–1000) as missing media", () => {
    expect(r.missingExternalMedia.map((m) => m.number)).toEqual(Array.from({ length: 35 }, (_, i) => 966 + i));
  });

  it("passes overall", () => {
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("validator catches problems", () => {
  const base: Question = { number: 1, question: "Q?", choices: ["a", "b", "c", "d"], answers: [1], notes: [], images: [], kind: "text", missingMedia: null };

  it("reports gaps and duplicates", () => {
    const r = validateQuestions([base, { ...base }, { ...base, number: 3 }], () => true, 3);
    expect(r.ok).toBe(false);
    expect(r.duplicateNumbers).toEqual([1]);
    expect(r.missingNumbers).toEqual([2]);
  });

  it("reports missing choices, answers and images by number", () => {
    const r = validateQuestions(
      [
        { ...base, choices: ["a", "b"] },
        { ...base, number: 2, answers: [] },
        { ...base, number: 3, answers: [7] },
        { ...base, number: 4, kind: "picture" },
        { ...base, number: 5, images: [{ src: "/q-images/nope.jpg", width: 1, height: 1 }] },
      ],
      () => false,
      5,
    );
    expect(r.missingChoices).toEqual([1]);
    expect(r.missingAnswers).toEqual([2]);
    expect(r.invalidAnswers).toEqual([3]);
    expect(r.imagesExpectedButMissing).toEqual([4]);
    expect(r.missingImageFiles).toEqual([{ number: 5, src: "/q-images/nope.jpg" }]);
  });
});
