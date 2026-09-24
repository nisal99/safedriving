# Seoul Driving Test Practice

A practice web app for the Korean driver's licence written test (운전면허 학과시험). It uses the English question bank in `source/1.pdf`, and works on phones and computers.

- **All 1,000 questions:** search, filters, and a jump to any question number.
- **Practice mode:** untimed, with right/wrong feedback straight after each answer.
- **Mock exam:** timed, with randomized questions, a countdown, a question navigator, flagging, submission, scoring and answer review.
- **Wrong-answers mode:** every question you miss, with a review that clears each one once you get it right.
- **Saved progress:** stored in the browser, so you can resume practice, wrong-answer reviews and a running mock exam. You can also back it up to a file and restore it.

Built with Next.js 16, TypeScript and Tailwind CSS 4. It's a fully static app that deploys to Vercel with no settings changes.

## What's in the bank

| | Count | Question numbers |
|---|---|---|
| Questions imported | **1,000 / 1,000** | 1–1000, no gaps, no duplicates |
| Text questions (문장형) | 680 | 1–680 |
| Photo / illustration situations (사진형·일러스트형, 5 options, 2 answers) | 186 | 681–865, 931 |
| Signs, road markings, plates (안전표지형) | 99 | 866–965 except 931 |
| Video questions (동영상형) | 35 | 966–1000 |
| Two-answer questions | 283 | shown by `npm run validate` |
| Questions with images | 285 | 681–965 (285 image files) |

Every question keeps its original number, wording, options and the answer printed in the PDF.

### Media limitations

- **Questions 966–1000 (35 questions) refer to videos** ("Refer to the website") that are **not in the PDF**. The app keeps these questions, with their text, options and official answer, and shows a clear "Video not included in the PDF" notice. No video content was invented. By default they are **left out of scored mock exams**, and you can turn that off in the mock-exam setup or in Settings. They can still be browsed and practised.
- Every other question that uses a picture has its image. Pictures are cropped from the PDF at 2× resolution. Where the PDF labels pictures with letters (A–D, ㉠–㉣, Ⓐ–Ⓓ), the whole labelled figure is kept as one image so the letters stay next to their pictures (Q871, 883, 907, 908, 931).

## Official test rules (mock-exam defaults)

These were checked on 24 Sep 2026 against the Korea Road Traffic Authority (KoROAD, 도로교통공단) Safe Driving portal and the Korean government's legal-information service:

| Setting | Default | Source |
|---|---|---|
| Number of questions | **40** (문제 수: 40문제) | KoROAD, 학과시험 안내: <https://www.safedriving.or.kr/dtGuide/selectDtGuide08.do> |
| Time limit | **40 minutes** (시험시간: 40분) | same page |
| Pass mark, Class 1 (1종 대형·특수·보통) | **70 / 100** | same page; also 찾기쉬운 생활법령정보, 운전면허시험응시: <https://www.easylaw.go.kr/CSP/CnpClsMainBtr.laf?popMenu=ov&csmSeq=668&ccfNo=2&cciNo=2&cnpClsNo=1> |
| Pass mark, Class 2 (2종 보통·소형·원동기) | **60 / 100** | same two sources |

Legal basis cited by easylaw.go.kr: Road Traffic Act art. 83 (「도로교통법」 제83조), Enforcement Decree arts. 46–47, Enforcement Rule art. 63.

**Question mix and points (configurable).** The official page doesn't give a breakdown by question type, so the default mix uses the widely published breakdown:

| Type | Questions | Points each |
|---|---|---|
| Text, 1 answer | 17 | 2 |
| Text, 2 answers | 4 | 3 |
| Signs | 5 | 2 |
| Photo / illustration, 2 answers | 13 | 3 |
| Video | 1 | 5 |
| **Total** | **40** | **100** |

Everything above (time, pass marks, the mix and the points) can be changed in the app under **Settings**. The defaults live in `src/lib/exam.ts` (`DEFAULT_EXAM_CONFIG`).

**Scoring:**
- A two-answer question scores only when **both** correct options are chosen and nothing else (no partial credit).
- The score is shown out of 100 as points earned ÷ points possible. If the video question is left out, the remaining 95 points are scaled to 100 and the results page says so.

## Run it locally

Requires Node.js 20 or newer (tested with Node 22).

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build        # runs `npm run validate` first; fails if any question is missing
npm start
```

## Checks and tests

```bash
npm run validate     # question-bank validation report (see below)
npm run verify:pdf   # independent re-check of every question against the PDF with pdf.js
npm test             # unit tests (scoring, exam builder, validation on the real data)
npm run lint
npm run typecheck
```

`npm run validate` confirms:
- exactly 1,000 unique question numbers, 1–1000 with no gaps;
- every question has text, at least 4 non-empty options, and 1 or 2 valid answers.

It reports, by question number:
- missing choices, missing or invalid answers;
- image files missing on disk, and picture questions without an image;
- questions whose external media (video) is missing.

The build fails if any check fails. Current output:

```
Questions found                    1000
Unique numbers                     1000 (expected 1000)
Missing numbers                    none
Duplicate numbers                  none
Missing question text              none
Missing / too few choices          none
Empty choice text                  none
Missing answers                    none
Invalid answers                    none
Two-answer questions               283
Questions with images              285  (681–965)
Picture questions without image    none
Image files missing on disk        none
Missing external media (video)     35  (966–1000)
OK: all 1000 questions (1–1000) present with choices and answers.
```

`npm run verify:pdf` re-reads `source/1.pdf` with Mozilla pdf.js, which shares no code with the importer. It splits the PDF at its 1,000 "■ Answer" markers and checks, for every question:
- the block starts with the right number;
- it contains the app's question text, every choice (4,186 in total) and every note (426);
- the answer is identical;
- nothing in the PDF is left over except the figure letters drawn into images (Q871, 883, 907, 908, 931).

Its result is saved in `data/pdf-verification.json`: no problems. Planting a wrong answer, an altered choice or a dropped note makes it fail.

Browser smoke test (desktop + phone viewports, 21 checks each, all passing): `e2e/smoke.mjs`. Run it with `npm i --no-save playwright && npx playwright install chromium`, start the app, then run `node e2e/smoke.mjs`.

The scoring tests cover:
- single-answer questions: right, wrong, empty and extra picks;
- two-answer questions: both right in any order, one right (no credit), wrong pair, duplicates, a third pick blocked;
- real questions Q1, Q8 and Q860;
- exam totals, the pass-mark edge case, and scaling when the video question is left out.

## Re-importing the PDF

The committed data (`data/questions.json`, `public/q-images/*.jpg`) was produced by `scripts/import_pdf.py` from `source/1.pdf` (SHA-256 `ca64f34b…8b0dc3`). To regenerate it:

```bash
pip install pymupdf
npm run import -- source/1.pdf     # = python3 scripts/import_pdf.py source/1.pdf
npm run validate
```

The importer:
- reads the question number, text, ①–⑤ options, `■` situation notes and `■ Answer` from the PDF text layer, strictly in number order;
- gives each picture to the question box it sits in, and crops it to the visible (clipped) area;
- trims white margins;
- flags video questions.

It writes `data/import-report.json`. That report would list any unassigned images, stray text or picture questions without images; all of those lists are currently empty. As a further check, every non-space character of the PDF's text was matched against the imported data (see also `npm run verify:pdf` below). The only differences are the 16 figure letters rendered into images and the full-width colon `：` normalized in `■ Answer：`.

## Deploying to Vercel

1. Push this repository to GitHub.
2. On <https://vercel.com/new>, import the repository. `vercel.json` pins the framework to Next.js, so no settings or environment variables are needed (this also covers a Vercel project created before the app code existed, whose "Framework Preset" is still "Other").
3. Click **Deploy**. Every push to the production branch redeploys.

With the Vercel CLI instead:

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

## Project layout

```
source/1.pdf                  original question bank (KoROAD, English)
scripts/import_pdf.py         PDF → data/questions.json + public/q-images
scripts/validate.ts           import validation CLI (npm run validate)
data/questions.json           all 1,000 questions
data/import-report.json       importer report
public/q-images/              285 question images
src/lib/                      question access, scoring, exam builder, validation, saved progress
src/components/               question view, study runner, navigation
src/app/                      pages: / · /questions · /practice · /mock · /wrong · /settings
```

Progress is stored in the browser's `localStorage`, on that device only. Use **Settings → Download backup / Load backup** to move it between devices.

The question bank is published by KoROAD. This app is an unofficial study aid.
