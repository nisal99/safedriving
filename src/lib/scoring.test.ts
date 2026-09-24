import { describe, expect, it } from "vitest";
import { getQuestion } from "./questions";
import { isComplete, isCorrect, scoreExam, toggleSelection } from "./scoring";

const single = { answers: [2] };
const double = { answers: [1, 4] };

describe("single-answer questions", () => {
  it("is correct only with the right option", () => {
    expect(isCorrect(single, [2])).toBe(true);
    expect(isCorrect(single, [3])).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
    expect(isCorrect(single, undefined)).toBe(false);
  });
  it("rejects extra selections", () => {
    expect(isCorrect(single, [2, 3])).toBe(false);
  });
  it("toggle replaces the previous pick", () => {
    expect(toggleSelection(single, [1], 3)).toEqual([3]);
    expect(toggleSelection(single, [3], 3)).toEqual([]);
  });
});

describe("two-answer questions", () => {
  it("needs both answers, in any order", () => {
    expect(isCorrect(double, [1, 4])).toBe(true);
    expect(isCorrect(double, [4, 1])).toBe(true);
  });
  it("gives no partial credit", () => {
    expect(isCorrect(double, [1])).toBe(false);
    expect(isCorrect(double, [1, 2])).toBe(false);
    expect(isCorrect(double, [2, 3])).toBe(false);
  });
  it("rejects duplicates and over-selection", () => {
    expect(isCorrect(double, [1, 1])).toBe(false);
    expect(isCorrect(double, [1, 4, 2])).toBe(false);
  });
  it("is complete only once two options are picked", () => {
    expect(isComplete(double, [1])).toBe(false);
    expect(isComplete(double, [1, 4])).toBe(true);
  });
  it("toggle adds up to two picks, sorts them, and ignores a third", () => {
    let s = toggleSelection(double, [], 4);
    s = toggleSelection(double, s, 1);
    expect(s).toEqual([1, 4]);
    expect(toggleSelection(double, s, 2)).toEqual([1, 4]);
    expect(toggleSelection(double, s, 4)).toEqual([1]);
  });
});

describe("real questions from the bank", () => {
  it("Q1 (single answer ②)", () => {
    const q = getQuestion(1)!;
    expect(q.answers).toEqual([2]);
    expect(isCorrect(q, [2])).toBe(true);
    expect(isCorrect(q, [1])).toBe(false);
  });
  it("Q8 (two answers ① and ④)", () => {
    const q = getQuestion(8)!;
    expect(q.answers).toEqual([1, 4]);
    expect(isCorrect(q, [4, 1])).toBe(true);
    expect(isCorrect(q, [1])).toBe(false);
  });
  it("Q860 (photo question, five options, answers ① and ⑤)", () => {
    const q = getQuestion(860)!;
    expect(q.choices).toHaveLength(5);
    expect(q.answers).toEqual([1, 5]);
    expect(isCorrect(q, [1, 5])).toBe(true);
    expect(isCorrect(q, [1, 4])).toBe(false);
  });
});

describe("scoreExam", () => {
  const qs = new Map([
    [1, { answers: [2] }],
    [2, { answers: [1, 3] }],
    [3, { answers: [4] }],
    [4, { answers: [2, 5] }],
  ]);
  const items = [
    { number: 1, points: 2 },
    { number: 2, points: 3 },
    { number: 3, points: 2 },
    { number: 4, points: 3 },
  ];

  it("adds points only for fully correct answers", () => {
    const r = scoreExam(items, qs, { 1: [2], 2: [1, 3], 3: [1], 4: [2] }, 60);
    expect(r.earned).toBe(5);
    expect(r.possible).toBe(10);
    expect(r.correct).toBe(2);
    expect(r.answered).toBe(4);
    expect(r.score).toBe(50);
    expect(r.passed).toBe(false);
  });

  it("passes at exactly the pass mark", () => {
    const r = scoreExam(items, qs, { 1: [2], 2: [3, 1], 4: [5, 2] }, 80);
    expect(r.earned).toBe(8);
    expect(r.score).toBe(80);
    expect(r.passed).toBe(true);
    expect(r.answered).toBe(3);
  });

  it("scales to 100 when fewer points are possible (e.g. video question left out)", () => {
    const r = scoreExam([{ number: 1, points: 2 }, { number: 2, points: 3 }], qs, { 1: [2] }, 60);
    expect(r.score).toBe(40);
  });

  it("official 100-point mix: Class 2 passes at 60, Class 1 needs 70", () => {
    // 20 single-answer (2 pts) + 20 two-answer (3 pts) = 100 points.
    const big = new Map<number, { answers: number[] }>();
    const its = [];
    for (let i = 1; i <= 40; i++) {
      big.set(i, { answers: i <= 20 ? [1] : [1, 2] });
      its.push({ number: i, points: i <= 20 ? 2 : 3 });
    }
    // All single-answer right (40 pts) + 7 two-answer right (21 pts) = 61.
    const resp: Record<number, number[]> = {};
    for (let i = 1; i <= 20; i++) resp[i] = [1];
    for (let i = 21; i <= 27; i++) resp[i] = [2, 1];
    for (let i = 28; i <= 40; i++) resp[i] = [1]; // half right = 0 points
    expect(scoreExam(its, big, resp, 60)).toMatchObject({ earned: 61, possible: 100, score: 61, passed: true });
    expect(scoreExam(its, big, resp, 70).passed).toBe(false);
  });
});
