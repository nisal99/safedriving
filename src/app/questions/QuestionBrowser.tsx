"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnswerLine, MissingMediaNotice, QuestionView } from "@/components/QuestionView";
import { getQuestion, KIND_LABELS, QUESTIONS, searchQuestions } from "@/lib/questions";
import { isComplete, toggleSelection } from "@/lib/scoring";
import { toggleBookmark, useProgress } from "@/lib/store";
import type { Question, QuestionKind, Selection } from "@/lib/types";

const PAGE = 40;
type Filter = "all" | QuestionKind | "two" | "saved" | "wrong";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: KIND_LABELS.text },
  { id: "picture", label: KIND_LABELS.picture },
  { id: "situation", label: KIND_LABELS.situation },
  { id: "two", label: "2-answer" },
  { id: "video", label: "Video questions" },
  { id: "saved", label: "★ Saved" },
  { id: "wrong", label: "Wrong" },
];

export function QuestionBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const n = Number(params.get("n")) || 0;
  const q = n ? getQuestion(n) : undefined;

  const setParams = (next: Record<string, string | null>, push = false) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const url = `${pathname}${sp.size ? `?${sp}` : ""}`;
    if (push) router.push(url, { scroll: true });
    else router.replace(url, { scroll: false });
  };

  if (q) return <Detail q={q} onNavigate={(num) => setParams({ n: num ? String(num) : null }, true)} />;
  return <List params={params} setParams={setParams} />;
}

function List({ params, setParams }: { params: URLSearchParams; setParams: (n: Record<string, string | null>, push?: boolean) => void }) {
  const { bookmarks, wrong, attempts } = useProgress();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [jump, setJump] = useState("");
  const [jumpError, setJumpError] = useState("");
  const filter = (params.get("f") as Filter) || "all";
  const page = Math.max(1, Number(params.get("p")) || 1);

  // Keep the search box responsive; write it to the URL shortly after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== query) setParams({ q: query || null, p: null });
    }, 250);
    return () => clearTimeout(t);
  });

  const results = useMemo(() => {
    const base = QUESTIONS.filter((x) => {
      switch (filter) {
        case "all":
          return true;
        case "two":
          return x.answers.length === 2;
        case "saved":
          return bookmarks.includes(x.number);
        case "wrong":
          return wrong.includes(x.number);
        default:
          return x.kind === filter;
      }
    });
    return searchQuestions(base, query);
  }, [filter, query, bookmarks, wrong]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE));
  const shown = results.slice((page - 1) * PAGE, page * PAGE);

  const goTo = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(jump);
    if (!getQuestion(num)) {
      setJumpError("Enter a number from 1 to 1000");
      return;
    }
    setJumpError("");
    setParams({ n: String(num) }, true);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">All 1,000 questions</h1>
        <p className="mt-1 text-muted">Search the whole bank, or jump straight to a question number.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          className="input"
          placeholder="Search words, e.g. “school zone”, “yield”, “BAC”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search questions"
        />
        <form onSubmit={goTo} className="flex gap-2">
          <input
            className="input w-full sm:w-32"
            inputMode="numeric"
            placeholder="Q number"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            aria-label="Question number"
            aria-invalid={!!jumpError}
          />
          <button className="btn-primary shrink-0">Go</button>
        </form>
      </div>
      {jumpError && <p className="-mt-2 text-sm text-bad">{jumpError}</p>}

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setParams({ f: f.id === "all" ? null : f.id, p: null })}
            className={`chip shrink-0 border py-1.5 ${filter === f.id ? "border-brand bg-brand text-white dark:text-[#0b1020]" : "border-line bg-surface text-muted hover:text-ink"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        {results.length === QUESTIONS.length ? `Showing all ${results.length} questions` : `${results.length} matching questions`}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>

      {shown.length === 0 ? (
        <div className="card p-6 text-center text-muted">No questions match. Try fewer words or another filter.</div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {shown.map((x) => (
            <Row key={x.number} q={x} saved={bookmarks.includes(x.number)} status={attempts[x.number]?.correct} onOpen={() => setParams({ n: String(x.number) }, true)} />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mx-auto grid max-w-md grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2" aria-label="Pages">
          <button className="btn-secondary px-3" disabled={page <= 1} onClick={() => setParams({ p: String(page - 1) })} aria-label="Previous page">
            ←<span className="hidden sm:inline"> Prev</span>
          </button>
          <select className="input min-w-0 truncate" value={page} onChange={(e) => setParams({ p: e.target.value })} aria-label="Page">
            {Array.from({ length: pages }, (_, i) => (
              <option key={i} value={i + 1}>
                Page {i + 1} (Q{results[i * PAGE].number}–{results[Math.min(results.length, (i + 1) * PAGE) - 1].number})
              </option>
            ))}
          </select>
          <button className="btn-secondary px-3" disabled={page >= pages} onClick={() => setParams({ p: String(page + 1) })} aria-label="Next page">
            <span className="hidden sm:inline">Next </span>→
          </button>
        </nav>
      )}
    </div>
  );
}

function Row({ q, saved, status, onOpen }: { q: Question; saved: boolean; status: boolean | undefined; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-start gap-3 p-3 text-left hover:bg-surface-2 sm:p-4">
        <span
          className={`mt-0.5 w-14 shrink-0 rounded-lg py-1 text-center text-xs font-bold ${
            status === true ? "bg-ok-soft text-ok" : status === false ? "bg-bad-soft text-bad" : "bg-surface-2 text-muted"
          }`}
        >
          Q{q.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-medium">{q.question}</span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
            <span>{KIND_LABELS[q.kind]}</span>
            {q.answers.length === 2 && <span>· 2 answers</span>}
            {q.images.length > 0 && <span>· picture</span>}
            {saved && <span className="text-brand">· ★ saved</span>}
            <MissingMediaNotice q={q} compact />
          </span>
        </span>
        {q.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.images[0].src} alt="" loading="lazy" className="hidden h-14 w-20 shrink-0 rounded-md border border-line object-cover sm:block" />
        )}
      </button>
    </li>
  );
}

function Detail({ q, onNavigate }: { q: Question; onNavigate: (n: number | null) => void }) {
  const { bookmarks, attempts } = useProgress();
  const [sel, setSel] = useState<Selection>([]);
  const [show, setShow] = useState(false);
  const [jump, setJump] = useState("");
  const reveal = show || isComplete(q, sel);

  // Reset local state when moving between questions.
  const [shownFor, setShownFor] = useState(q.number);
  if (shownFor !== q.number) {
    setShownFor(q.number);
    setSel([]);
    setShow(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" && q.number < 1000) onNavigate(q.number + 1);
      if (e.key === "ArrowLeft" && q.number > 1) onNavigate(q.number - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q.number, onNavigate]);

  const a = attempts[q.number];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/questions" className="btn-ghost -ml-2 px-2">
          ← All questions
        </Link>
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (getQuestion(Number(jump))) onNavigate(Number(jump));
            setJump("");
          }}
        >
          <input className="input w-28 py-1.5" inputMode="numeric" placeholder="Q number" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))} aria-label="Go to question number" />
          <button className="btn-secondary py-1.5">Go</button>
        </form>
      </div>

      <div className="card p-4 sm:p-6">
        <QuestionView q={q} selection={sel} onToggle={(c) => !reveal && setSel(toggleSelection(q, sel, c))} reveal={reveal} disabled={reveal} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {reveal ? (
            <>
              <div className="flex-1">
                <AnswerLine q={q} />
              </div>
              <button className="btn-ghost" onClick={() => { setSel([]); setShow(false); }}>
                Hide answer
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted">Tap an option to check yourself{q.answers.length === 2 ? " (choose 2)" : ""}, or</p>
              <button className="btn-secondary" onClick={() => setShow(true)}>
                Show answer
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={() => toggleBookmark(q.number)} aria-pressed={bookmarks.includes(q.number)}>
            {bookmarks.includes(q.number) ? "★ Saved" : "☆ Save"}
          </button>
        </div>
        {a && (
          <p className="mt-2 text-xs text-muted">
            Your record: {a.right} right out of {a.tries} tries · last time {a.correct ? "correct" : "wrong"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button className="btn-secondary" disabled={q.number <= 1} onClick={() => onNavigate(q.number - 1)}>
          ← Q{q.number - 1 || ""}
        </button>
        <span className="text-sm text-muted">{q.number} / 1000</span>
        <button className="btn-secondary" disabled={q.number >= 1000} onClick={() => onNavigate(q.number + 1)}>
          Q{q.number < 1000 ? q.number + 1 : ""} →
        </button>
      </div>
    </div>
  );
}
