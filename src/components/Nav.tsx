"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgress } from "@/lib/store";

const LINKS = [
  { href: "/", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/questions", label: "All 1,000", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/practice", label: "Practice", icon: "M5 12l5 5L20 7" },
  { href: "/mock", label: "Mock exam", icon: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" },
  { href: "/wrong", label: "Wrong", icon: "M6 6l12 12M18 6L6 18" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const { wrong } = useProgress();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm text-white dark:text-[#0b1020]">운</span>
            <span className="leading-tight">
              Seoul Driving Test <span className="hidden text-muted sm:inline">· Practice</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.slice(1).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${active(l.href) ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}`}
              >
                {l.label}
                {l.href === "/wrong" && wrong.length > 0 && <span className="ml-1.5 chip bg-bad-soft text-bad">{wrong.length}</span>}
              </Link>
            ))}
            <Link href="/settings" className={`rounded-lg px-3 py-2 text-sm font-medium ${active("/settings") ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}`}>
              Settings
            </Link>
          </nav>
          <Link href="/settings" className="ml-auto rounded-lg p-2 text-muted md:hidden" aria-label="Settings">
            <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </Link>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="grid grid-cols-5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(l.href) ? "text-brand" : "text-muted"}`}
            >
              <Icon d={l.icon} />
              {l.label}
              {l.href === "/wrong" && wrong.length > 0 && (
                <span className="absolute right-[22%] top-1 min-w-4 rounded-full bg-bad px-1 text-[10px] leading-4 text-white">{wrong.length}</span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
