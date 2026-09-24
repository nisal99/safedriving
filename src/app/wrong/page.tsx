"use client";

import Link from "next/link";
import { StudyRunner } from "@/components/StudyRunner";
import { choiceMark, MissingMediaNotice } from "@/components/QuestionView";
import { getQuestion } from "@/lib/questions";
import { shuffle } from "@/lib/random";
import { update, useHydrated, useProgress } from "@/lib/store";

export default function WrongPage() {
  const hydrated = useHydrated();
  const { wrong, wrongSession, attempts } = useProgress();

  if (!hydrated) return <p className="text-muted">Loading…</p>;

  if (wrongSession) {
    return (
      <StudyRunner
        session={wrongSession}
        removeFromWrongIfCorrect
        onChange={(s) => update((p) => ({ ...p, wrongSession: s }))}
        onExit={() => update((p) => ({ ...p, wrongSession: null }))}
      />
    );
  }

  const sorted = [...wrong].sort((a, b) => a - b);
  const start = (random: boolean) =>
    update((p) => ({
      ...p,
      wrongSession: {
        queue: random ? shuffle(sorted) : sorted,
        index: 0,
        answers: {},
        label: "Wrong answers review",
        startedAt: Date.now(),
      },
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Wrong answers</h1>
        <p className="mt-1 text-muted">
          Every question you get wrong in practice or a mock exam lands here. Answer it correctly in this review and it’s cleared from the
          list.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-lg font-semibold">Nothing to review yet 🎉</p>
          <p className="mt-1 text-muted">Questions you miss will appear here.</p>
          <Link href="/practice" className="btn-primary mt-4">
            Start practising
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => start(false)}>
              Review {sorted.length} in order
            </button>
            <button className="btn-secondary" onClick={() => start(true)}>
              Review shuffled
            </button>
            <button
              className="btn-ghost ml-auto"
              onClick={() => {
                if (confirm("Clear the whole wrong-answers list?")) update((p) => ({ ...p, wrong: [] }));
              }}
            >
              Clear list
            </button>
          </div>
          <ul className="card divide-y divide-line">
            {sorted.map((n) => {
              const q = getQuestion(n)!;
              const a = attempts[n];
              return (
                <li key={n} className="flex items-start gap-3 p-3 sm:p-4">
                  <Link href={`/questions?n=${n}`} className="chip mt-0.5 shrink-0 bg-bad-soft text-bad">
                    Q{n}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/questions?n=${n}`} className="line-clamp-2 font-medium hover:text-brand">
                      {q.question}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {a ? `Your last answer: ${a.last.map(choiceMark).join(", ")} · ` : ""}Correct: {q.answers.map(choiceMark).join(", ")}
                      {a ? ` · ${a.right}/${a.tries} right` : ""}
                    </p>
                    <div className="mt-1">
                      <MissingMediaNotice q={q} compact />
                    </div>
                  </div>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => update((p) => ({ ...p, wrong: p.wrong.filter((w) => w !== n) }))}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
