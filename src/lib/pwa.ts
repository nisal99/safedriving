"use client";

import { useSyncExternalStore } from "react";

/** Chrome/Edge/Android event that lets us show our own "Install app" button. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Platform = "ios" | "android" | "desktop";

interface PwaState {
  /** A native install prompt is available (Chrome, Edge, Samsung Internet, Android). */
  canPrompt: boolean;
  /** Running as an installed app. */
  installed: boolean;
  platform: Platform;
  /** Offline download progress, 0–1, or null when idle. */
  offlineProgress: number | null;
  offlineSavedAt: number | null;
  offlineError: string | null;
}

const OFFLINE_KEY = "seoul-driving-practice:offline-saved-at";
const SERVER: PwaState = { canPrompt: false, installed: false, platform: "desktop", offlineProgress: null, offlineSavedAt: null, offlineError: null };

let state: PwaState = SERVER;
let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Start listening for install events and register the service worker (once, in the browser). */
export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;
  let savedAt: number | null = null;
  try {
    savedAt = Number(localStorage.getItem(OFFLINE_KEY)) || null;
  } catch {
    // storage blocked: offline status just isn't remembered
  }
  state = { ...state, platform: detectPlatform(), installed: isStandalone(), offlineSavedAt: savedAt };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the browser's own icon, but also enable our button
    deferred = e as BeforeInstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ canPrompt: false, installed: true });
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => set({ installed: isStandalone() }));

  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the site still works online.
    });
  }
}

/** Show the browser's install dialog. Returns false when no native prompt is available. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  set({ canPrompt: false, installed: outcome === "accepted" || state.installed });
  return true;
}

/**
 * Download every page, script and question picture into the browser cache so the app works with no
 * connection. The service worker serves them from there.
 */
export async function saveForOffline(imageUrls: string[]) {
  if (!("caches" in window)) {
    set({ offlineError: "This browser can’t store the app for offline use." });
    return;
  }
  set({ offlineProgress: 0, offlineError: null });
  try {
    const pages = ["/", "/questions", "/practice", "/mock", "/wrong", "/settings", "/manifest.webmanifest"];
    const assets = new Set<string>(["/icons/icon-192.png", "/icons/icon-512.png"]);
    const pageCache = await caches.open("pages-v1");
    const assetCache = await caches.open("assets-v1");

    // Pages first; collect the scripts and styles each page needs.
    for (const p of pages) {
      const res = await fetch(p, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${p} returned ${res.status}`);
      const text = await res.clone().text();
      for (const m of text.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
      await pageCache.put(p, res);
    }
    for (const e of performance.getEntriesByType("resource")) {
      const u = new URL(e.name);
      if (u.origin === location.origin && u.pathname.startsWith("/_next/static/")) assets.add(u.pathname);
    }
    imageUrls.forEach((u) => assets.add(u));

    const list = [...assets];
    const total = pages.length + list.length;
    let done = pages.length;
    const queue = list.slice();
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift()!;
        if (!(await assetCache.match(u))) {
          const res = await fetch(u);
          if (res.ok) await assetCache.put(u, res);
        }
        done++;
        if (done % 5 === 0 || done === total) set({ offlineProgress: done / total });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    const now = Date.now();
    try {
      localStorage.setItem(OFFLINE_KEY, String(now));
    } catch {
      // ignore
    }
    set({ offlineProgress: null, offlineSavedAt: now });
  } catch (err) {
    set({ offlineProgress: null, offlineError: `Download stopped: ${(err as Error).message}. Check your connection and try again.` });
  }
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}
