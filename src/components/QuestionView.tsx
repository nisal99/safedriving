"use client";

import { KIND_LABELS } from "@/lib/questions";
import type { Question, Selection } from "@/lib/types";

const MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

export function choiceMark(i: number) {
  return MARKS[i - 1] ?? `${i}.`;
}

export function MissingMediaNotice({ q, compact = false }: { q: Question; compact?: boolean }) {
  if (!q.missingMedia) return null;
  if (compact) return <span className="chip bg-warn-soft text-warn">Video missing</span>;
  return (
    <div role="note" className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
      <p className="font-semibold">Video not included in the PDF</p>
      <p className="mt-0.5 opacity-90">
        This question depends on a video from the official test website, which is not part of the question bank you supplied. The
        question, options and official answer are shown exactly as printed, but it can’t be answered fairly without the clip, so it is
        left out of scored mock exams by default.
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
                // Plain <img>: the files are already sized for the web; no optimisation pipeline needed.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.src}
                  src={img.src}
                  width={img.width}
                  height={img.height}
                  alt={`Picture for question ${q.number}${q.images.length > 1 ? ` (${i + 1})` : ""}`}
                  className="h-auto w-full rounded-xl border border-line bg-white object-contain"
                  loading="lazy"
                />
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
