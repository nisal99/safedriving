"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnswerLine, QuestionView } from "@/components/QuestionView";
import { BUCKET_LABELS, BUCKETS, buildExam, type LicenseClass, totalPoints, totalQuestions } from "@/lib/exam";
import { getQuestion, QUESTIONS } from "@/lib/questions";
import { isComplete, isCorrect, scoreExam, toggleSelection } from "@/lib/scoring";
import { getProgress, type MockSession, recordAttempt, update, useHydrated, useProgress } from "@/lib/store";

const QMAP = new Map(QUESTIONS.map((q) => [q.number, q]));

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MockPage() {
  const hydrated = useHydrated();
  const { mock } = useProgress();
  if (!hydrated) return <p className="text-muted">Loading…</p>;
  if (!mock) return <Setup />;
  if (mock.submittedAt) return <Results session={mock} />;
  return <Exam session={mock} />;
}

function submit(session: MockSession) {
  // Guard against double submission (timer tick + button, or two open tabs).
  const live = getProgress().mock;
  if (!live || live.id !== session.id || live.submittedAt) return;
  session = live; // latest saved responses
  const passMark = session.config.passMark[session.config.licenseClass];
  const result = scoreExam(session.items, QMAP, session.responses, passMark);
  // Feed the wrong-answers list (unanswered questions count as wrong).
  for (const item of session.items) {
    const q = QMAP.get(item.number)!;
    const sel = session.responses[item.number] ?? [];
    recordAttempt(item.number, sel, isCorrect(q, sel));
  }
  const done: MockSession = { ...session, submittedAt: Date.now(), result };
  update((p) => ({ ...p, mock: done, history: [done, ...p.history].slice(0, 30) }));
}

function Setup() {
  const { config, history } = useProgress();
  const excluded = config.excludeMissingMedia ? config.composition.video : 0;
  const count = totalQuestions(config) - excluded;
  const points = totalPoints(config) - excluded * config.points.video;

  const setClass = (licenseClass: LicenseClass) => update((p) => ({ ...p, config: { ...p.config, licenseClass } }));
  const setExclude = (excludeMissingMedia: boolean) => update((p) => ({ ...p, config: { ...p.config, excludeMissingMedia } }));

  const start = () => {
    const items = buildExam(QUESTIONS, config);
    const now = Date.now();
    update((p) => ({
      ...p,
      mock: {
        id: String(now),
        items,
        responses: {},
        flagged: [],
        current: 0,
        startedAt: now,
        deadline: now + config.timeLimitMinutes * 60_000,
        config,
        excludedMedia: excluded,
      },
    }));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Mock exam</h1>
        <p className="mt-1 text-muted">Randomly drawn questions in the same mix as the real computer-based test, against the clock.</p>
      </header>

      <section className="card space-y-5 p-4 sm:p-6">
        <div>
          <p className="mb-2 text-sm font-semibold">Licence class</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["class2", "class1"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setClass(c)}
                className={`rounded-xl border p-3 text-left ${config.licenseClass === c ? "border-brand bg-brand-soft ring-2 ring-brand/30" : "border-line"}`}
              >
                <span className="block font-semibold">{c === "class1" ? "Class 1 (1종 보통 / 대형 / 특수)" : "Class 2 (2종 보통 / 소형 / 원동기)"}</span>
                <span className="text-sm text-muted">Pass mark {config.passMark[c]} / 100</span>
              </button>
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Questions</dt>
            <dd className="text-2xl font-bold">{count}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Time</dt>
            <dd className="text-2xl font-bold">{config.timeLimitMinutes}m</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Pass mark</dt>
            <dd className="text-2xl font-bold">{config.passMark[config.licenseClass]}</dd>
          </div>
        </dl>

        <details className="rounded-xl border border-line p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Question mix &amp; points</summary>
          <table className="mt-2 w-full">
            <tbody>
              {BUCKETS.map((b) => (
                <tr key={b} className={b === "video" && config.excludeMissingMedia ? "text-muted line-through" : ""}>
                  <td className="py-1 pr-2">{BUCKET_LABELS[b]}</td>
                  <td className="py-1 text-right tabular-nums">
                    {config.composition[b]} × {config.points[b]} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-muted">
            Total {points} points{points !== 100 && ", scaled to 100 for pass/fail"}. Two-answer questions score only when both answers are right.
            Change these in <Link href="/settings" className="text-brand underline">Settings</Link>.
          </p>
        </details>

        <label className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--warn)]" checked={config.excludeMissingMedia} onChange={(e) => setExclude(e.target.checked)} />
          <span>
            <span className="font-semibold text-warn">Leave out video questions (recommended)</span>
            <span className="block text-ink/80">
              Questions 966–1000 need a video clip that isn’t in the PDF (each question links to the official KoROAD video), so they can’t be shown inside a timed exam. When left out, the exam has {config.composition.video} fewer
              question and the score is scaled to 100.
            </span>
          </span>
        </label>

        <button className="btn-primary w-full py-3 text-base sm:w-auto sm:px-8" onClick={start}>
          Start {config.timeLimitMinutes}-minute exam
        </button>
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Past exams</h2>
          <ul className="card divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-3 text-sm">
                <span className={`chip ${h.result?.passed ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{h.result?.passed ? "PASS" : "FAIL"}</span>
                <span className="font-semibold tabular-nums">{h.result?.score}</span>
                <span className="text-muted">
                  {h.result?.correct}/{h.result?.total} correct · {h.config.licenseClass === "class1" ? "Class 1" : "Class 2"}
                </span>
                <span className="ml-auto text-muted">{new Date(h.startedAt).toLocaleString()}</span>
                <button className="btn-ghost px-2 py-1" onClick={() => update((p) => ({ ...p, mock: h }))}>
                  Review
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Exam({ session }: { session: MockSession }) {
  const [now, setNow] = useState(() => Date.now());
  const [showNav, setShowNav] = useState(false);
  const remaining = session.deadline - now;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining <= 0) submit(session);
  }, [remaining, session]);

  const item = session.items[session.current];
  const q = getQuestion(item.number)!;
  const sel = session.responses[q.number] ?? [];
  const answered = session.items.filter((it) => isComplete(QMAP.get(it.number)!, session.responses[it.number])).length;
  const flagged = session.flagged.includes(q.number);

  const set = (patch: Partial<MockSession>) => update((p) => (p.mock ? { ...p, mock: { ...p.mock, ...patch } } : p));
  const go = (i: number) => {
    set({ current: Math.max(0, Math.min(session.items.length - 1, i)) });
    setShowNav(false);
    window.scrollTo({ top: 0 });
  };
  const toggle = (c: number) => set({ responses: { ...session.responses, [q.number]: toggleSelection(q, sel, c) } });
  const confirmSubmit = () => {
    const left = session.items.length - answered;
    if (confirm(left ? `${left} question${left > 1 ? "s are" : " is"} unanswered. Submit anyway?` : "Submit your exam?")) submit(session);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = Number(e.key);
      if (d >= 1 && d <= q.choices.length) toggle(d);
      else if (e.key === "ArrowRight") go(session.current + 1);
      else if (e.key === "ArrowLeft") go(session.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const navigator = (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
      {session.items.map((it, i) => {
        const done = isComplete(QMAP.get(it.number)!, session.responses[it.number]);
        const fl = session.flagged.includes(it.number);
        return (
          <button
            key={it.number}
            onClick={() => go(i)}
            aria-label={`Question ${i + 1}${done ? ", answered" : ""}${fl ? ", flagged" : ""}`}
            aria-current={i === session.current}
            className={`relative aspect-square rounded-lg text-xs font-semibold tabular-nums ${
              i === session.current ? "ring-2 ring-brand ring-offset-1 ring-offset-surface" : ""
            } ${done ? "bg-brand text-white dark:text-[#0b1020]" : "bg-surface-2 text-muted"}`}
          >
            {i + 1}
            {fl && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warn" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-lg px-2.5 py-1 font-mono text-lg font-bold tabular-nums ${remaining < 5 * 60_000 ? "bg-bad-soft text-bad" : "bg-surface-2"}`}
            role="timer"
            aria-label="Time remaining"
          >
            {fmt(remaining)}
          </span>
          <span className="hidden text-sm text-muted lg:inline">
            Q{session.current + 1}/{session.items.length} · {answered} answered
          </span>
          <button className="btn-secondary ml-auto px-3 py-1.5 tabular-nums lg:hidden" onClick={() => setShowNav((v) => !v)} aria-expanded={showNav}>
            Q{session.current + 1}/{session.items.length} {showNav ? "▴" : "▾"}
          </button>
          <span className="hidden lg:ml-auto lg:block" />
          <button className="btn-primary px-3 py-1.5" onClick={confirmSubmit}>
            Submit
          </button>
        </div>
        {showNav && (
          <div className="mt-3 space-y-2 pb-1 lg:hidden">
            <p className="text-xs text-muted">
              {answered} of {session.items.length} answered · blue = answered · orange dot = flagged
            </p>
            {navigator}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="card p-4 sm:p-6">
          <p className="mb-2 text-xs font-semibold text-muted">
            Exam question {session.current + 1} · {item.points} points
          </p>
          <QuestionView q={q} selection={sel} onToggle={toggle} />
          {q.answers.length === 2 && <p className="mt-3 text-sm text-muted">Choose 2 answers. Tap a chosen answer again to change it.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => go(session.current - 1)} disabled={session.current === 0}>
              ← Prev
            </button>
            <button
              className={`btn-ghost ${flagged ? "text-warn" : ""}`}
              onClick={() => set({ flagged: flagged ? session.flagged.filter((f) => f !== q.number) : [...session.flagged, q.number] })}
              aria-pressed={flagged}
            >
              {flagged ? "⚑ Flagged" : "⚐ Flag"}
            </button>
            <span className="flex-1" />
            {session.current < session.items.length - 1 ? (
              <button className="btn-primary" onClick={() => go(session.current + 1)}>
                Next →
              </button>
            ) : (
              <button className="btn-primary" onClick={confirmSubmit}>
                Submit exam
              </button>
            )}
          </div>
        </div>
        <aside className="card hidden h-fit space-y-3 p-4 lg:sticky lg:top-32 lg:block">
          <p className="text-sm font-semibold">Questions</p>
          {navigator}
          <p className="text-xs text-muted">Blue = answered · orange dot = flagged</p>
          <button
            className="btn-ghost w-full text-bad"
            onClick={() => confirm("Abandon this exam? It won’t be scored.") && update((p) => ({ ...p, mock: null }))}
          >
            Abandon exam
          </button>
        </aside>
      </div>
    </div>
  );
}

function Results({ session }: { session: MockSession }) {
  const r = session.result!;
  const [view, setView] = useState<"wrong" | "all" | "flagged">("wrong");
  const [open, setOpen] = useState<number | null>(null);
  const minutes = Math.round(((session.submittedAt ?? session.deadline) - session.startedAt) / 60000);

  const rows = useMemo(
    () =>
      session.items
        .map((it, i) => ({ it, i, q: QMAP.get(it.number)!, sel: session.responses[it.number] ?? [] }))
        .filter(({ q, sel, it }) =>
          view === "all" ? true : view === "flagged" ? session.flagged.includes(it.number) : !isCorrect(q, sel),
        ),
    [session, view],
  );

  return (
    <div className="space-y-6">
      <section className={`card overflow-hidden`}>
        <div className={`p-5 sm:p-7 ${r.passed ? "bg-ok-soft" : "bg-bad-soft"}`}>
          <p className={`text-sm font-bold uppercase tracking-wide ${r.passed ? "text-ok" : "text-bad"}`}>{r.passed ? "Passed" : "Not passed"}</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums">
            {r.score}
            <span className="text-2xl font-semibold text-muted"> / 100</span>
          </p>
          <p className="mt-1 text-sm">
            Pass mark {r.passMark} ({session.config.licenseClass === "class1" ? "Class 1" : "Class 2"})
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {[
            ["Correct", `${r.correct} / ${r.total}`],
            ["Points", `${r.earned} / ${r.possible}`],
            ["Answered", `${r.answered} / ${r.total}`],
            ["Time used", `${Math.min(minutes, session.config.timeLimitMinutes)} min`],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface p-3 text-center">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-lg font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {session.excludedMedia > 0 && (
          <p className="border-t border-line p-3 text-xs text-muted">
            {session.excludedMedia} video question{session.excludedMedia > 1 ? "s were" : " was"} left out because the video isn’t in the PDF; the score is
            scaled from {r.possible} to 100 points.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => update((p) => ({ ...p, mock: null }))}>
          New exam
        </button>
        <Link href="/wrong" className="btn-secondary">
          Practise wrong answers
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-bold">Answer review</h2>
          {(["wrong", "all", "flagged"] as const).map((v) => (
            <button key={v} className={`chip border py-1.5 ${view === v ? "border-brand bg-brand text-white dark:text-[#0b1020]" : "border-line text-muted"}`} onClick={() => setView(v)}>
              {v === "wrong" ? `Wrong (${r.total - r.correct})` : v === "all" ? `All (${r.total})` : `Flagged (${session.flagged.length})`}
            </button>
          ))}
        </div>
        {rows.length === 0 && <p className="card p-4 text-muted">Nothing here.</p>}
        <ul className="space-y-2">
          {rows.map(({ it, i, q, sel }) => {
            const ok = isCorrect(q, sel);
            return (
              <li key={it.number} className="card overflow-hidden">
                <button className="flex w-full items-start gap-3 p-3 text-left sm:p-4" onClick={() => setOpen(open === it.number ? null : it.number)} aria-expanded={open === it.number}>
                  <span className={`chip mt-0.5 shrink-0 ${ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{ok ? "✓" : "✗"} {i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">{q.question}</span>
                    <span className="text-xs text-muted">
                      Q{q.number} · {it.points} pts · {sel.length ? `you chose ${sel.join(", ")}` : "not answered"} · answer {q.answers.join(", ")}
                    </span>
                  </span>
                </button>
                {open === it.number && (
                  <div className="border-t border-line p-4 sm:p-6">
                    <QuestionView q={q} selection={sel} reveal disabled />
                    <div className="mt-3">
                      <AnswerLine q={q} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
