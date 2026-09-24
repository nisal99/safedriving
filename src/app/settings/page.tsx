"use client";

import { useRef, useState } from "react";
import { BUCKET_LABELS, BUCKETS, type Bucket, DEFAULT_EXAM_CONFIG, type ExamConfig, totalPoints, totalQuestions } from "@/lib/exam";
import { QUESTIONS } from "@/lib/questions";
import { InstallCard } from "@/components/InstallApp";
import { exportProgress, importProgress, resetProgress, update, useHydrated, useProgress } from "@/lib/store";
import { bucketOf } from "@/lib/exam";

const AVAILABLE = Object.fromEntries(BUCKETS.map((b) => [b, QUESTIONS.filter((q) => bucketOf(q) === b).length])) as Record<Bucket, number>;

function NumberField({ label, value, onChange, min = 0, max = 1000 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="number"
        className="input w-24 py-1.5 text-right"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
      />
    </label>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const { config } = useProgress();
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  if (!hydrated) return <p className="text-muted">Loading…</p>;

  const set = (patch: Partial<ExamConfig>) => update((p) => ({ ...p, config: { ...p.config, ...patch } }));

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `driving-practice-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted">Mock-exam rules and your saved progress.</p>
      </header>

      <section className="card space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Mock exam rules</h2>
          <p className="text-sm text-muted">
            Defaults follow KoROAD’s official rules: 40 questions, 40 minutes, pass mark 70 (Class 1) / 60 (Class 2). See the README for sources.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Time limit (min)" value={config.timeLimitMinutes} min={1} max={300} onChange={(v) => set({ timeLimitMinutes: v })} />
          <NumberField label="Pass mark, Class 1" value={config.passMark.class1} max={100} onChange={(v) => set({ passMark: { ...config.passMark, class1: v } })} />
          <NumberField label="Pass mark, Class 2" value={config.passMark.class2} max={100} onChange={(v) => set({ passMark: { ...config.passMark, class2: v } })} />
        </div>
        <div className="divide-y divide-line rounded-xl border border-line text-sm">
          <div className="hidden grid-cols-[1fr_4rem_6rem_6rem] gap-3 px-3 py-2 text-xs text-muted sm:grid">
            <span>Question type</span>
            <span className="text-right">In bank</span>
            <span className="text-right">Questions</span>
            <span className="text-right">Points each</span>
          </div>
          {BUCKETS.map((b) => (
            <div key={b} className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[1fr_4rem_6rem_6rem] sm:items-center sm:py-2">
              <span className="col-span-2 font-medium sm:col-span-1 sm:font-normal">
                {BUCKET_LABELS[b]}
                <span className="ml-1 text-xs text-muted sm:hidden">({AVAILABLE[b]} in bank)</span>
              </span>
              <span className="hidden text-right tabular-nums text-muted sm:block">{AVAILABLE[b]}</span>
              <label className="flex items-center justify-between gap-2 sm:block">
                <span className="text-xs text-muted sm:hidden">Questions</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input w-24 py-1.5 text-right sm:w-full"
                  min={0}
                  max={AVAILABLE[b]}
                  value={config.composition[b]}
                  onChange={(e) => set({ composition: { ...config.composition, [b]: Math.max(0, Math.min(AVAILABLE[b], Number(e.target.value) || 0)) } })}
                  aria-label={`${BUCKET_LABELS[b]} count`}
                />
              </label>
              <label className="flex items-center justify-between gap-2 sm:block">
                <span className="text-xs text-muted sm:hidden">Points each</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input w-24 py-1.5 text-right sm:w-full"
                  min={0}
                  max={20}
                  value={config.points[b]}
                  onChange={(e) => set({ points: { ...config.points, [b]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) } })}
                  aria-label={`${BUCKET_LABELS[b]} points`}
                />
              </label>
            </div>
          ))}
          <div className="flex justify-between gap-3 px-3 py-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {totalQuestions(config)} questions · {totalPoints(config)} pts
            </span>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={config.excludeMissingMedia} onChange={(e) => set({ excludeMissingMedia: e.target.checked })} />
          Leave video questions (media missing from the PDF) out of scored mock exams
        </label>
        <p className="text-xs text-muted">Scores are always shown out of 100 (points earned ÷ points possible), so pass marks work with any mix.</p>
        <button className="btn-secondary" onClick={() => set(DEFAULT_EXAM_CONFIG)}>
          Restore official defaults
        </button>
      </section>

      <InstallCard />

      <section className="card space-y-3 p-4 sm:p-6">
        <h2 className="text-lg font-bold">Your progress</h2>
        <p className="text-sm text-muted">
          Progress is saved automatically in this browser. To move it to another device, download a backup and load it there.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={download}>
            Download backup
          </button>
          <button className="btn-secondary" onClick={() => file.current?.click()}>
            Load backup…
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importProgress(await f.text());
                setMsg("Backup loaded.");
              } catch (err) {
                setMsg(`Couldn’t load that file: ${(err as Error).message}`);
              }
              e.target.value = "";
            }}
          />
          <button
            className="btn-ghost text-bad"
            onClick={() => {
              if (confirm("Erase all answers, wrong-answer list, bookmarks and exam history? Exam settings are kept.")) {
                resetProgress();
                setMsg("Progress reset.");
              }
            }}
          >
            Reset progress
          </button>
        </div>
        {msg && <p className="text-sm" role="status">{msg}</p>}
      </section>
    </div>
  );
}
