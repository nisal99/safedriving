import type { MetadataRoute } from "next";

// Web app manifest: makes the site installable (Chrome/Edge "Install app" icon, Android "Install app",
// iOS "Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Seoul Driving Test Practice",
    short_name: "Driving Test",
    description: "Practise all 1,000 questions of the Korean driver’s licence written test, with timed mock exams. Works offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f7fb",
    theme_color: "#1d4ed8",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Practice", url: "/practice", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mock exam", url: "/mock", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "All 1,000 questions", url: "/questions", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Wrong answers", url: "/wrong", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
