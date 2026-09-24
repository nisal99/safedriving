"use client";

import { useEffect, useRef, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import { promptInstall, saveForOffline, startPwa, usePwa, type Platform } from "@/lib/pwa";

// Attach install listeners as early as possible: the browser fires `beforeinstallprompt` only once.
if (typeof window !== "undefined") startPwa();

const IMAGE_URLS = QUESTIONS.flatMap((q) => q.images.map((i) => i.src));

/** Monitor-with-arrow icon, like the browser's own install button. */
export function InstallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4M12 7v5M9.5 9.5 12 12l2.5-2.5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
      <path d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8" />
    </svg>
  );
}

function Steps({ platform }: { platform: Platform }) {
  if (platform === "ios") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Open this page in <b>Safari</b>.
        </li>
        <li>
          Tap the <b>Share</b> button <ShareIcon /> (bottom of the screen on iPhone, top on iPad).
        </li>
        <li>
          Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
        <li>Open “Driving Test” from your home screen. It runs full-screen like an app.</li>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Open this page in <b>Chrome</b> (or Samsung Internet / Edge).
        </li>
        <li>
          Tap the <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).
        </li>
        <li>
          Tap <b>Install</b>. The app appears on your home screen and in your app drawer.
        </li>
      </ol>
    );
  }
  return (
    <ol className="list-decimal space-y-2 pl-5">
      <li>
        <b>Chrome or Edge (Windows, Mac, Linux, Chromebook):</b> click the install icon <InstallIcon className="inline h-4 w-4 align-[-3px]" /> at
        the right end of the address bar, then <b>Install</b>. Or open the browser menu and choose <b>Cast, save and share → Install page as app</b>{" "}
        (Chrome) / <b>Apps → Install this site as an app</b> (Edge).
      </li>
      <li>
        <b>Safari on Mac (Sonoma or later):</b> <b>File → Add to Dock</b>.
      </li>
      <li>
        <b>Firefox:</b> doesn’t support installing sites as apps; use Chrome, Edge or Safari, or just bookmark the page.
      </li>
    </ol>
  );
}

export function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { platform, installed } = usePwa();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <div className="max-h-[85dvh] space-y-4 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white dark:text-[#0b1020]">
            <InstallIcon />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Install the app</h2>
            <p className="text-sm text-muted">Get a home-screen / desktop icon, full-screen study and offline use.</p>
          </div>
          <button className="btn-ghost -mr-2 -mt-1 px-2 py-1" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {installed ? (
          <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok">You’re already using the installed app. 🎉</p>
        ) : (
          <div className="text-sm leading-relaxed">
            <Steps platform={platform} />
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Other devices</summary>
          <div className="mt-3 space-y-4">
            {(["ios", "android", "desktop"] as const)
              .filter((p) => p !== platform)
              .map((p) => (
                <div key={p}>
                  <p className="mb-1 font-semibold">{p === "ios" ? "iPhone / iPad" : p === "android" ? "Android phone / tablet" : "Computer"}</p>
                  <Steps platform={p} />
                </div>
              ))}
          </div>
        </details>
        <button className="btn-primary w-full" onClick={onClose}>
          Got it
        </button>
      </div>
    </dialog>
  );
}

/** Header button. Uses the browser's own install prompt when available, otherwise shows instructions. */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { installed, canPrompt } = usePwa();
  const [help, setHelp] = useState(false);
  if (installed) return null;
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (!(await promptInstall())) setHelp(true);
        }}
        className={
          compact
            ? "grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            : `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium ${canPrompt ? "bg-brand text-white dark:text-[#0b1020]" : "text-muted hover:text-ink"}`
        }
        aria-label="Install app"
        title="Install app"
      >
        <InstallIcon />
        {!compact && <span className="hidden lg:inline">Install app</span>}
      </button>
      <InstallDialog open={help} onClose={() => setHelp(false)} />
    </>
  );
}

/** Card with install + "save for offline" controls (home page and settings). */
export function InstallCard() {
  const { installed, canPrompt, offlineProgress, offlineSavedAt, offlineError, platform } = usePwa();
  const [help, setHelp] = useState(false);
  const busy = offlineProgress !== null;

  return (
    <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <InstallIcon /> {installed ? "App installed" : "Install on your phone or computer"}
        </h2>
        <p className="text-sm text-muted">
          {installed
            ? "You’re using the installed app."
            : platform === "ios"
              ? "Add it to your Home Screen from Safari’s Share menu to use it like an app."
              : "One tap adds an app icon to your home screen, dock or Start menu."}
        </p>
        {!installed && (
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={async () => {
              if (!(await promptInstall())) setHelp(true);
            }}
          >
            <InstallIcon className="h-4 w-4" /> {canPrompt ? "Install app" : "How to install"}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Study offline</h2>
        <p className="text-sm text-muted">
          Save all 1,000 questions and 285 pictures (about 12 MB) on this device so the app works without internet: on the subway or with no data.
        </p>
        {busy ? (
          <div aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-brand transition-all" style={{ width: `${Math.round((offlineProgress ?? 0) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">Downloading… {Math.round((offlineProgress ?? 0) * 100)}%</p>
          </div>
        ) : (
          <button className="btn-secondary w-full sm:w-auto" onClick={() => saveForOffline(IMAGE_URLS)}>
            ⬇ {offlineSavedAt ? "Update offline copy" : "Save for offline"}
          </button>
        )}
        {offlineSavedAt && !busy && <p className="text-xs text-ok">✓ Saved for offline on {new Date(offlineSavedAt).toLocaleString()}</p>}
        {offlineError && <p className="text-xs text-bad">{offlineError}</p>}
        <p className="text-xs text-muted">Official KoROAD videos (questions 966–1000) open from KoROAD’s site and need internet.</p>
      </div>
      <InstallDialog open={help} onClose={() => setHelp(false)} />
    </section>
  );
}
