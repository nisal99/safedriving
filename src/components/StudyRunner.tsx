"use client";

import { useEffect, useState } from "react";
import { getQuestion } from "@/lib/questions";
import { isComplete, isCorrect, toggleSelection } from "@/lib/scoring";
import { recordAttempt, toggleBookmark, useProgress, type StudySession } from "@/lib/store";
import { AnswerLine, QuestionView } from "./QuestionView";

interface Props {
  session: StudySession;
  onChange: (s: StudySession) => void;
  onExit: () => void;
  /** In wrong-answers mode, a correct answer removes the question from the wrong list. */
  removeFromWrongIfCorrect?: boolean;
}

export function StudyRunner({ session, onChange, onExit, removeFromWrongIfCorrect = false }: Props) {
  const { bookmarks } = useProgress();
  const [jump, setJump] = useState("");
  const n = session.queue[session.index];
  const q = getQuestion(n);
  const sel = session.answers[n] ?? [];
  const done = q ? isComplete(q, sel) : false;
  const correct = q ? isCorrect(q, sel) : false;

  const answeredCount = Object.keys(session.answers).filter((k) => {
    const qq = getQuestion(Number(k));
    return qq && isComplete(qq, session.answers[Number(k)]);
  }).length;
  const correctCount = Object.keys(session.answers).filter((k) => {
    const qq = getQuestion(Number(k));
    return qq && isCorrect(qq, session.answers[Number(k)]);
  }).length;

  const go = (i: number) => onChange({ ...session, index: Math.max(0, Math.min(session.queue.length - 1, i)) });

  const toggle = (choice: number) => {
    if (!q || done) return;
    const next = toggleSelection(q, sel, choice);
    onChange({ ...session, answers: { ...session.answers, [n]: next } });
    if (isComplete(q, next)) recordAttempt(n, next, isCorrect(q, next), { removeFromWrongIfCorrect });
  };

  const retry = () => {
    const answers = { ...session.answers };
    delete answers[n];
    onChange({ ...session, answers });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const d = Number(e.key);
      if (q && d >= 1 && d <= q.choices.length) toggle(d);
      else if (e.key === "ArrowRight" || (e.key === "Enter" && done)) go(session.index + 1);
      else if (e.key === "ArrowLeft") go(session.index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) return null;
  const last = session.index === session.queue.length - 1;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-sm">
        <span className="font-semibold">{session.label}</span>
        <span className="text-muted">
          {session.index + 1} / {session.queue.length}
        </span>
        <span className="text-muted">
          {correctCount} correct of {answeredCount} answered
        </span>
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const target = Number(jump);
            const pos = session.queue.indexOf(target);
            if (pos >= 0) go(pos);
            else if (target >= 1 && target <= session.queue.length) go(target - 1);
            setJump("");
          }}
        >
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Go to Q#"
            aria-label="Go to question number"
            className="input w-28 py-1.5 text-sm"
          />
        </form>
        <button className="btn-ghost px-2 py-1.5" onClick={onExit}>
          Exit
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full bg-brand transition-all" style={{ width: `${((session.index + 1) / session.queue.length) * 100}%` }} />
      </div>

      <div className="card p-4 sm:p-6">
        <QuestionView q={q} selection={sel} onToggle={toggle} reveal={done} disabled={done} />

        <div aria-live="polite" className="mt-4">
          {done ? (
            <div className={`rounded-xl p-3 ${correct ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
              <p className="font-bold">{correct ? "Correct!" : "Not quite."}</p>
              <div className="text-ink">
                <AnswerLine q={q} />
              </div>
            </div>
          ) : (
            q.answers.length === 2 && (
              <p className="text-sm text-muted">
                Pick {2 - sel.length} more {sel.length === 1 ? "answer" : "answers"} — both must be right.
              </p>
            )
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={() => go(session.index - 1)} disabled={session.index === 0}>
            ← Previous
          </button>
          {done && (
            <button className="btn-ghost" onClick={retry}>
              Try again
            </button>
          )}
          <button className="btn-ghost" onClick={() => toggleBookmark(n)} aria-pressed={bookmarks.includes(n)}>
            {bookmarks.includes(n) ? "★ Saved" : "☆ Save"}
          </button>
          <span className="flex-1" />
          {last ? (
            <button className="btn-primary" onClick={onExit}>
              Finish
            </button>
          ) : (
            <button className="btn-primary" onClick={() => go(session.index + 1)}>
              {done ? "Next →" : "Skip →"}
            </button>
          )}
        </div>
      </div>
      <p className="hidden text-center text-xs text-muted md:block">Keyboard: 1–5 to answer · ← → to move · Enter for next</p>
    </div>
  );
}
