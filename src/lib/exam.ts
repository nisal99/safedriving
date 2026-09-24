import { shuffle } from "./random";
import type { ExamItem } from "./scoring";
import type { Question } from "./types";

/** Buckets used to build a mock exam with the same mix of question types as the real test. */
export type Bucket = "text1" | "text2" | "picture" | "situation" | "video";

export const BUCKET_LABELS: Record<Bucket, string> = {
  text1: "Text, 1 answer (문장형 4지1답)",
  text2: "Text, 2 answers (문장형 4지2답)",
  picture: "Signs / pictures (안전표지형)",
  situation: "Photo & illustration, 2 answers (사진형·일러스트형)",
  video: "Video (동영상형)",
};

export function bucketOf(q: Question): Bucket {
  if (q.kind === "video") return "video";
  if (q.kind === "situation") return "situation";
  if (q.kind === "picture") return "picture";
  return q.answers.length === 2 ? "text2" : "text1";
}

export type LicenseClass = "class1" | "class2";

export interface ExamConfig {
  licenseClass: LicenseClass;
  /** Minutes allowed for the whole exam. */
  timeLimitMinutes: number;
  /** Pass mark out of 100 for each licence class. */
  passMark: Record<LicenseClass, number>;
  /** Number of questions drawn from each bucket. */
  composition: Record<Bucket, number>;
  /** Points per question in each bucket. */
  points: Record<Bucket, number>;
  /** Leave out questions whose video/website media is missing from the PDF. */
  excludeMissingMedia: boolean;
}

/**
 * Defaults, verified against official sources (see README "Official test rules"):
 * - 40 questions, 40 minutes, pass mark 70 (Class 1) / 60 (Class 2): KoROAD Safe Driving portal.
 * - Per-type mix and points (17×2 + 4×3 + 5×2 + 13×3 + 1×5 = 100): widely published breakdown,
 *   not stated on the official page, so it is configurable in Settings.
 */
export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  licenseClass: "class2",
  timeLimitMinutes: 40,
  passMark: { class1: 70, class2: 60 },
  composition: { text1: 17, text2: 4, picture: 5, situation: 13, video: 1 },
  points: { text1: 2, text2: 3, picture: 2, situation: 3, video: 5 },
  excludeMissingMedia: true,
};

export const BUCKETS: Bucket[] = ["text1", "text2", "picture", "situation", "video"];

export function totalQuestions(c: ExamConfig): number {
  return BUCKETS.reduce((n, b) => n + c.composition[b], 0);
}

export function totalPoints(c: ExamConfig): number {
  return BUCKETS.reduce((n, b) => n + c.composition[b] * c.points[b], 0);
}

/** Draw a randomized exam. Returns items in random order with their point values. */
export function buildExam(questions: Question[], config: ExamConfig, rand: () => number = Math.random): ExamItem[] {
  const items: ExamItem[] = [];
  for (const bucket of BUCKETS) {
    if (bucket === "video" && config.excludeMissingMedia) continue;
    const pool = questions.filter((q) => bucketOf(q) === bucket && (!config.excludeMissingMedia || q.missingMedia === null));
    const picked = shuffle(pool, rand).slice(0, Math.max(0, config.composition[bucket]));
    for (const q of picked) items.push({ number: q.number, points: config.points[bucket] });
  }
  return shuffle(items, rand);
}

export function mergeConfig(saved: Partial<ExamConfig> | undefined): ExamConfig {
  const d = DEFAULT_EXAM_CONFIG;
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    passMark: { ...d.passMark, ...saved.passMark },
    composition: { ...d.composition, ...saved.composition },
    points: { ...d.points, ...saved.points },
  };
}
