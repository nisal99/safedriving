"use client";

import Link from "next/link";
import { QUESTIONS } from "@/lib/questions";
import { InstallCard } from "@/components/InstallApp";
import { useHydrated, useProgress } from "@/lib/store";

export default function Home() {
  const hydrated = useHydrated();
  const { attempts, wrong, practice, wrongSession, mock, history, config, bookmarks } = useProgress();
  const answered = Object.keys(attempts).length;
  const correctNow = Object.values(attempts).filter((a) => a.correct).length;
  const last = history[0];

  const resume = hydrated
    ? [
        mock && !mock.submittedAt && { href: "/mock", title: "Resume mock exam", sub: `${Object.keys(mock.responses).length}/${mock.items.length} answered · timer still running` },
        practice && { href: "/practice", title: "Resume practice", sub: `${practice.label} · question ${practice.index + 1} of ${practice.queue.length}` },
        wrongSession && { href: "/wrong", title: "Resume wrong-answer review", sub: `question ${wrongSession.index + 1} of ${wrongSession.queue.length}` },
      ].filter(Boolean) as { href: string; title: string; sub: string }[]
    : [];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-brand p-6 text-white sm:p-10 dark:text-[#0b1020]">
        <p className="text-sm font-semibold opacity-80">운전면허 학과시험 · Korean driver’s licence written test</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">Practise all {QUESTIONS.length.toLocaleString()} official questions before your test in Seoul.</h1>
        <p className="mt-3 max-w-xl opacity-90">
          The real test: {config.composition.text1 + config.composition.text2 + config.composition.picture + config.composition.situation + config.composition.video} questions in{" "}
          {config.timeLimitMinutes} minutes. Pass with {config.passMark.class1} for Class 1 or {config.passMark.class2} for Class 2.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/mock" className="btn bg-white px-5 py-3 text-brand-strong hover:bg-white/90 dark:bg-[#0b1020] dark:text-white">
            Take a mock exam
          </Link>
          <Link href="/practice" className="btn border border-white/40 px-5 py-3 hover:bg-white/10 dark:border-black/30">
            Practise
          </Link>
        </div>
      </section>

      {resume.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Pick up where you left off</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {resume.map((r) => (
              <Link key={r.href} href={r.href} className="card flex items-center gap-3 p-4 hover:border-brand">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">▶</span>
                <span>
                  <span className="block font-semibold">{r.title}</span>
                  <span className="text-sm text-muted">{r.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Answered", hydrated ? `${answered} / 1000` : "–"],
          ["Correct last try", hydrated ? String(correctNow) : "–"],
          ["To review", hydrated ? String(wrong.length) : "–"],
          ["Last mock", hydrated && last?.result ? `${last.result.score} ${last.result.passed ? "✓" : "✗"}` : "–"],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-medium text-muted">{k}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </section>
      {hydrated && (
        <div className="-mt-4 h-2 overflow-hidden rounded-full bg-surface-2" aria-label={`${answered} of 1000 answered`}>
          <div className="h-full bg-brand" style={{ width: `${answered / 10}%` }} />
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/questions", title: "All 1,000 questions", body: "Search by keyword, filter by type, or jump straight to any question number." },
          { href: "/practice", title: "Practice mode", body: "Untimed, with instant feedback after every answer. Pick a range, type or shuffle." },
          { href: "/mock", title: "Timed mock exam", body: "Random questions, countdown, question navigator, flagging, score and full review." },
          { href: "/wrong", title: "Wrong answers", body: `Everything you’ve missed in one place${hydrated && wrong.length ? ` — ${wrong.length} waiting` : ""}.` },
          { href: "/questions?f=saved", title: "Saved questions", body: `Questions you starred${hydrated && bookmarks.length ? ` (${bookmarks.length})` : ""}.` },
          { href: "/settings", title: "Settings & progress", body: "Exam rules, back up or restore progress, reset." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="card p-5 transition hover:border-brand">
            <h3 className="font-bold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
          </Link>
        ))}
      </section>

      <InstallCard />

      <p className="text-xs text-muted">
        Questions 966–1000 need videos that aren’t in the PDF; each one links to its official KoROAD video. They’re included for browsing and practice, and left out
        of scored mock exams by default. Progress is saved in this browser only — use Settings to back it up.
      </p>
    </div>
  );
}
