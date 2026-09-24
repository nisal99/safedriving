"use client";

import { useState } from "react";
import { StudyRunner } from "@/components/StudyRunner";
import { KIND_LABELS, QUESTIONS } from "@/lib/questions";
import { shuffle } from "@/lib/random";
import { update, useHydrated, useProgress } from "@/lib/store";
import type { QuestionKind } from "@/lib/types";

const KINDS: QuestionKind[] = ["text", "picture", "situation", "video"];

export default function PracticePage() {
  const hydrated = useHydrated();
  const { practice, attempts, bookmarks } = useProgress();
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1000");
  const [kinds, setKinds] = useState<QuestionKind[]>(["text", "picture", "situation", "video"]);
  const [order, setOrder] = useState<"sequential" | "random">("sequential");
  const [only, setOnly] = useState<"all" | "unanswered" | "bookmarked" | "two">("all");

  if (!hydrated) return <p className="text-muted">Loading…</p>;

  if (practice) {
    return (
      <StudyRunner
        session={practice}
        onChange={(s) => update((p) => ({ ...p, practice: s }))}
        onExit={() => update((p) => ({ ...p, practice: null }))}
      />
    );
  }

  const lo = Math.max(1, Number(from) || 1);
  const hi = Math.min(1000, Number(to) || 1000);
  const pool = QUESTIONS.filter(
    (q) =>
      q.number >= lo &&
      q.number <= hi &&
      kinds.includes(q.kind) &&
      (only === "all" ||
        (only === "unanswered" && !attempts[q.number]) ||
        (only === "bookmarked" && bookmarks.includes(q.number)) ||
        (only === "two" && q.answers.length === 2)),
  );

  const start = () => {
    const nums = pool.map((q) => q.number);
    const queue = order === "random" ? shuffle(nums) : nums;
    update((p) => ({
      ...p,
      practice: {
        queue,
        index: 0,
        answers: {},
        label: `Practice Q${lo}–${hi}${order === "random" ? " (shuffled)" : ""}`,
        startedAt: Date.now(),
      },
    }));
  };

  const answered = Object.keys(attempts).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Practice mode</h1>
        <p className="mt-1 text-muted">Untimed. You see whether you’re right straight after each answer, and your place is saved automatically.</p>
      </header>

      <section className="card space-y-5 p-4 sm:p-6">
        <div>
          <p className="mb-2 text-sm font-semibold">Question range</p>
          <div className="flex items-center gap-2">
            <input className="input w-28" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))} aria-label="From question" />
            <span className="text-muted">to</span>
            <input className="input w-28" inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))} aria-label="To question" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              [1, 1000],
              [1, 250],
              [251, 500],
              [501, 680],
              [681, 965],
              [966, 1000],
            ].map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                className="chip border border-line bg-surface py-1 text-muted hover:text-ink"
                onClick={() => {
                  setFrom(String(a));
                  setTo(String(b));
                }}
              >
                {a}–{b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Question types</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={kinds.includes(k)}
                  onChange={(e) => setKinds(e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k))}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {KIND_LABELS[k]}
                {k === "video" && <span className="text-xs text-warn">(video missing)</span>}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Order</p>
            <div className="flex gap-2">
              {(["sequential", "random"] as const).map((o) => (
                <button key={o} className={order === o ? "btn-primary" : "btn-secondary"} onClick={() => setOrder(o)}>
                  {o === "sequential" ? "In order" : "Shuffled"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Include</p>
            <select className="input" value={only} onChange={(e) => setOnly(e.target.value as typeof only)}>
              <option value="all">All questions</option>
              <option value="unanswered">Only ones I haven’t answered yet</option>
              <option value="bookmarked">Only saved (★) questions</option>
              <option value="two">Only two-answer questions</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button className="btn-primary px-6" onClick={start} disabled={pool.length === 0}>
            Start practice ({pool.length} questions)
          </button>
          <span className="text-sm text-muted">You’ve answered {answered} of 1,000 questions at least once.</span>
        </div>
      </section>
    </div>
  );
}
