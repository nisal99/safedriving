"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_EXAM_CONFIG, type ExamConfig, mergeConfig } from "./exam";
import type { ExamItem, ExamScore } from "./scoring";
import type { Selection } from "./types";

/** Saved in the browser so the user can close the tab and resume later. */
export interface Attempt {
  last: Selection;
  correct: boolean;
  tries: number;
  right: number;
  at: number;
}

export interface StudySession {
  queue: number[];
  index: number;
  /** Selections made in this session, keyed by question number. */
  answers: Record<number, Selection>;
  label: string;
  startedAt: number;
}

export interface MockSession {
  id: string;
  items: ExamItem[];
  responses: Record<number, Selection>;
  flagged: number[];
  current: number;
  startedAt: number;
  deadline: number;
  config: ExamConfig;
  excludedMedia: number;
  submittedAt?: number;
  result?: ExamScore;
}

export interface Progress {
  version: 1;
  attempts: Record<number, Attempt>;
  wrong: number[];
  bookmarks: number[];
  practice: StudySession | null;
  wrongSession: StudySession | null;
  mock: MockSession | null;
  history: MockSession[];
  config: ExamConfig;
}

const KEY = "seoul-driving-practice:v1";

export const EMPTY: Progress = {
  version: 1,
  attempts: {},
  wrong: [],
  bookmarks: [],
  practice: null,
  wrongSession: null,
  mock: null,
  history: [],
  config: DEFAULT_EXAM_CONFIG,
};

let state: Progress = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { ...EMPTY, ...parsed, config: mergeConfig(parsed.config) };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        state = load();
        listeners.forEach((l) => l());
      }
    });
  }
}

export function getProgress(): Progress {
  ensureLoaded();
  return state;
}

export function update(fn: (p: Progress) => Progress) {
  ensureLoaded();
  state = fn(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): progress stays in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** React hook: current progress. Server render and first client render use the empty state. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => EMPTY);
}

/** True after hydration, so pages can avoid flashing "no progress" before storage loads. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Record an answer from practice / wrong-answer mode / mock review. */
export function recordAttempt(n: number, selection: Selection, correct: boolean, opts: { removeFromWrongIfCorrect?: boolean } = {}) {
  update((p) => {
    const prev = p.attempts[n];
    const attempt: Attempt = {
      last: selection,
      correct,
      tries: (prev?.tries ?? 0) + 1,
      right: (prev?.right ?? 0) + (correct ? 1 : 0),
      at: Date.now(),
    };
    let wrong = p.wrong;
    if (!correct && !wrong.includes(n)) wrong = [...wrong, n];
    if (correct && opts.removeFromWrongIfCorrect) wrong = wrong.filter((w) => w !== n);
    return { ...p, attempts: { ...p.attempts, [n]: attempt }, wrong };
  });
}

export function toggleBookmark(n: number) {
  update((p) => ({
    ...p,
    bookmarks: p.bookmarks.includes(n) ? p.bookmarks.filter((b) => b !== n) : [...p.bookmarks, n].sort((a, b) => a - b),
  }));
}

export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 1);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json) as Partial<Progress>;
  if (parsed.version !== 1) throw new Error("Not a progress file from this app.");
  update(() => ({ ...EMPTY, ...parsed, config: mergeConfig(parsed.config) }));
}

export function resetProgress() {
  update((p) => ({ ...EMPTY, config: p.config }));
}
