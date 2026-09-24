import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seoul Driving Test Practice",
  description: "Practice all 1,000 questions of the Korean driver's licence written test (English question bank).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-8">{children}</main>
      </body>
    </html>
  );
}
