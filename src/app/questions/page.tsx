import { Suspense } from "react";
import { QuestionBrowser } from "./QuestionBrowser";

export const metadata = { title: "All 1,000 questions · Seoul Driving Test Practice" };

export default function QuestionsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading questions…</p>}>
      <QuestionBrowser />
    </Suspense>
  );
}
