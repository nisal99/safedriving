/**
 * Import validation: confirms the bank has exactly 1,000 unique question numbers (1–1000, no gaps)
 * and reports missing choices, answers, images and external media by question number.
 *
 *   npm run validate
 *
 * Exits with code 1 if anything is wrong, so `npm run build` (which runs this first) fails too.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ranges, validateQuestions } from "../src/lib/validate";
import type { Question } from "../src/lib/types";

const root = path.resolve(__dirname, "..");
const questions: Question[] = JSON.parse(readFileSync(path.join(root, "data/questions.json"), "utf8"));
const report = validateQuestions(questions, (src) => existsSync(path.join(root, "public", src)));

const line = (label: string, nums: number[]) => console.log(`  ${label.padEnd(34)} ${nums.length ? `${nums.length}  (${ranges(nums)})` : "none"}`);

console.log("Question bank validation");
console.log(`  Questions found                    ${report.count}`);
console.log(`  Unique numbers                     ${report.uniqueNumbers} (expected ${report.expected})`);
line("Missing numbers", report.missingNumbers);
line("Duplicate numbers", report.duplicateNumbers);
line("Missing question text", report.missingQuestionText);
line("Missing / too few choices", report.missingChoices);
line("Empty choice text", report.emptyChoices);
line("Missing answers", report.missingAnswers);
line("Invalid answers", report.invalidAnswers);
line("Two-answer questions", report.twoAnswerQuestions);
line("Questions with images", report.questionsWithImages);
line("Picture questions without image", report.imagesExpectedButMissing);
line("Image files missing on disk", report.missingImageFiles.map((m) => m.number));
line("Missing external media (video)", report.missingExternalMedia.map((m) => m.number));

if (!report.ok) {
  console.error("\nFAILED:\n  - " + report.errors.join("\n  - "));
  process.exit(1);
}
console.log(`\nOK: all ${report.expected} questions (1–${report.expected}) present with choices and answers.`);
