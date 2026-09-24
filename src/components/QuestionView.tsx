"use client";

import { useEffect, useRef, useState } from "react";
import { KIND_LABELS } from "@/lib/questions";
import { officialVideo } from "@/lib/videos";
import type { Question, QuestionImage, Selection } from "@/lib/types";

const MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

export function choiceMark(i: number) {
  return MARKS[i - 1] ?? `${i}.`;
}

/**
 * Question picture. Loads eagerly (lazy-loading left some images blank on some browsers),
 * never upscales small signs beyond 2x, and shows a visible message with a retry button
 * if the file fails to load instead of an empty box.
 */
function QuestionImg({ img, alt }: { img: QuestionImage; alt: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // An image that errored before hydration never fires onError; detect it here.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [attempt]);
  if (failed) {
    return (
      <div role="alert" className="grid min-h-40 place-items-center gap-2 rounded-xl border border-bad/40 bg-bad-soft p-4 text-center text-sm text-bad">
        <p>The picture didn’t load. Check your connection.</p>
        <button
          type="button"
          className="btn-secondary py-1.5"
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  const src = attempt ? `${img.src}?retry=${attempt}` : img.src;
  return (
    // Plain <img>: the files are already sized for the web; no optimisation pipeline needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      width={img.width}
      height={img.height}
      alt={alt}
      decoding="async"
      onError={() => setFailed(true)}
      style={{ maxWidth: Math.max(img.width * 2, 320) }}
      className="h-auto w-full rounded-xl border border-line bg-white object-contain"
    />
  );
}

export function MissingMediaNotice({ q, compact = false }: { q: Question; compact?: boolean }) {
  if (!q.missingMedia) return null;
  if (compact) return <span className="chip bg-warn-soft text-warn">Video question</span>;
  const video = officialVideo(q.number);
  return (
    <div role="note" className="space-y-3 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-warn sm:p-4">
      <div>
        <p className="font-semibold">This question needs a video</p>
        <p className="mt-0.5 opacity-90">
          The video isn’t in the PDF question bank. Watch the official clip from KoROAD first, then answer. Video questions are left out
          of scored mock exams by default.
        </p>
      </div>
      {video && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a href={video.file} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto">
            {video.format === "mp4" ? "▶ Watch official video (MP4)" : "⬇ Download official video (WMV)"}
          </a>
          <a href={video.page} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full sm:w-auto">
            Open KoROAD page
          </a>
        </div>
      )}
      {video && video.format !== "mp4" && (
        <p className="text-xs text-ink/80">
          WMV files don’t play in web browsers. After downloading, open it with VLC (free for phone and computer) or Windows Media Player.
        </p>
      )}
      <p className="text-xs text-ink/70">
        Source: KoROAD 학과시험 동영상 문제 (question {q.number}). Personal study only; KoROAD prohibits commercial use.
      </p>
    </div>
  );
}

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="chip bg-brand text-white dark:text-[#0b1020]">Q{q.number}</span>
      <span className="chip bg-surface-2 text-muted">{KIND_LABELS[q.kind]}</span>
      {q.answers.length === 2 && <span className="chip bg-brand-soft text-brand">Select 2 answers</span>}
      <MissingMediaNotice q={q} compact />
    </div>
  );
}

type ChoiceState = "idle" | "selected" | "correct" | "wrong" | "missed";

const STATE_CLASS: Record<ChoiceState, string> = {
  idle: "border-line bg-surface hover:border-brand/60 hover:bg-surface-2",
  selected: "border-brand bg-brand-soft ring-2 ring-brand/30",
  correct: "border-ok bg-ok-soft",
  wrong: "border-bad bg-bad-soft",
  missed: "border-ok border-dashed bg-surface",
};

export interface QuestionViewProps {
  q: Question;
  selection?: Selection;
  onToggle?: (choice: number) => void;
  /** Show correct / incorrect colouring. */
  reveal?: boolean;
  disabled?: boolean;
}

export function QuestionView({ q, selection = [], onToggle, reveal = false, disabled = false }: QuestionViewProps) {
  const stateOf = (i: number): ChoiceState => {
    const picked = selection.includes(i);
    const right = q.answers.includes(i);
    if (reveal) {
      if (right && picked) return "correct";
      if (picked) return "wrong";
      if (right) return selection.length ? "missed" : "correct";
      return "idle";
    }
    return picked ? "selected" : "idle";
  };

  return (
    <article className="space-y-4">
      <QuestionMeta q={q} />
      <h2 className="whitespace-pre-line text-lg font-semibold leading-relaxed sm:text-xl">{q.question}</h2>

      <MissingMediaNotice q={q} />

      {(q.images.length > 0 || q.notes.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-start">
          {q.images.length > 0 && (
            <div className={`grid gap-2 ${q.images.length > 1 ? "grid-cols-2" : ""} ${q.notes.length === 0 ? "sm:col-span-2 sm:max-w-xl" : ""}`}>
              {q.images.map((img, i) => (
                <QuestionImg key={img.src} img={img} alt={`Picture for question ${q.number}${q.images.length > 1 ? ` (${i + 1})` : ""}`} />
              ))}
            </div>
          )}
          {q.notes.length > 0 && (
            <ul className="space-y-1.5 rounded-xl bg-surface-2 p-3 text-sm">
              {q.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 bg-ink/70" aria-hidden />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-2" role="group" aria-label="Answer choices">
        {q.choices.map((c, idx) => {
          const i = idx + 1;
          const st = stateOf(i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !onToggle}
              aria-pressed={selection.includes(i)}
              onClick={() => onToggle?.(i)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] leading-snug transition disabled:cursor-default ${STATE_CLASS[st]}`}
            >
              <span className="mt-px text-lg leading-none text-muted">{choiceMark(i)}</span>
              <span className="flex-1 whitespace-pre-line">{c}</span>
              {reveal && (st === "correct" || st === "missed") && <span className="chip bg-ok text-white dark:text-[#0b1020]">Answer</span>}
              {reveal && st === "wrong" && <span className="chip bg-bad text-white dark:text-[#0b1020]">Your pick</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function AnswerLine({ q }: { q: Question }) {
  return (
    <p className="text-sm">
      <span className="font-semibold">Official answer:</span> {q.answers.map((a) => choiceMark(a)).join(", ")}
    </p>
  );
}
