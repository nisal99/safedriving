import { describe, expect, it } from "vitest";
import { bucketOf, buildExam, DEFAULT_EXAM_CONFIG, totalPoints, totalQuestions } from "./exam";
import { getQuestion, QUESTIONS } from "./questions";
import { seeded } from "./random";

describe("default exam config", () => {
  it("matches the official 40 questions / 100 points / 40 minutes", () => {
    expect(totalQuestions(DEFAULT_EXAM_CONFIG)).toBe(40);
    expect(totalPoints(DEFAULT_EXAM_CONFIG)).toBe(100);
    expect(DEFAULT_EXAM_CONFIG.timeLimitMinutes).toBe(40);
    expect(DEFAULT_EXAM_CONFIG.passMark).toEqual({ class1: 70, class2: 60 });
  });
});

describe("buildExam", () => {
  it("draws the configured mix without duplicates, leaving out video questions by default", () => {
    const items = buildExam(QUESTIONS, DEFAULT_EXAM_CONFIG, seeded(1));
    expect(items).toHaveLength(39);
    expect(new Set(items.map((i) => i.number)).size).toBe(39);
    const counts: Record<string, number> = {};
    for (const it of items) {
      const q = getQuestion(it.number)!;
      expect(q.missingMedia).toBeNull();
      counts[bucketOf(q)] = (counts[bucketOf(q)] ?? 0) + 1;
    }
    expect(counts).toEqual({ text1: 17, text2: 4, picture: 5, situation: 13 });
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(95);
  });

  it("includes a video question when the user opts in", () => {
    const items = buildExam(QUESTIONS, { ...DEFAULT_EXAM_CONFIG, excludeMissingMedia: false }, seeded(2));
    expect(items).toHaveLength(40);
    expect(items.filter((i) => getQuestion(i.number)!.kind === "video")).toHaveLength(1);
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(100);
  });

  it("is randomized between exams", () => {
    const a = buildExam(QUESTIONS, DEFAULT_EXAM_CONFIG, seeded(3)).map((i) => i.number);
    const b = buildExam(QUESTIONS, DEFAULT_EXAM_CONFIG, seeded(4)).map((i) => i.number);
    expect(a).not.toEqual(b);
  });
});
