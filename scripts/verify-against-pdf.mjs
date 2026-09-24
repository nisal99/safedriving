// Independent check of data/questions.json against source/1.pdf using Mozilla pdf.js (shares no code with
// the PyMuPDF importer). Splits the PDF at every "■ Answer" marker (must be exactly 1000) and checks that
// segment N starts with "N.", contains the question text, every choice and every note, has the same answer,
// and that nothing is left over except figure letters (A–D, ㉠–㉣) that are drawn into the images.
//   npm run verify:pdf
import { readFileSync, writeFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const pdf = await getDocument({ data: new Uint8Array(readFileSync(`${ROOT}/source/1.pdf`)), verbosity: 0 }).promise;
const data = JSON.parse(readFileSync(`${ROOT}/data/questions.json`, "utf8"));


let full = "";
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const tc = await page.getTextContent();
  full += tc.items.map((it) => it.str).join(" ") + " ";
}
// Normalise: drop all whitespace, map dingbat digits (Q509) to circled digits, unify colons.
const keep = (s) => s.replace(/[➀-➅]/g, (c) => "①②③④⑤⑥"[c.charCodeAt(0) - 0x2780]).replace(/：/g, ":").replace(/\s+/g, "");
const K = keep(full);

// Split independently at every "■Answer:" marker.
const re = /■Answer:(\d(?:,\d)*)/g;
const segs = [];
let last = 0,
  m;
while ((m = re.exec(K))) {
  segs.push({ body: K.slice(last, m.index), answers: m[1].split(",").map(Number) });
  last = re.lastIndex;
}

const problems = [];
const add = (n, msg) => problems.push(`Q${n}: ${msg}`);
if (segs.length !== 1000) problems.push(`PDF has ${segs.length} answer markers (expected 1000)`);
if (data.length !== 1000) problems.push(`data has ${data.length} questions`);

let checkedChoices = 0,
  checkedNotes = 0;
const leftovers = [];
for (let k = 0; k < Math.min(segs.length, data.length); k++) {
  const q = data[k];
  const seg = segs[k];
  const n = k + 1;
  if (q.number !== n) add(n, `data out of order (number ${q.number})`);
  if (!seg.body.startsWith(`${n}.`)) add(n, `PDF segment does not start with "${n}." → "${seg.body.slice(0, 30)}"`);
  if (JSON.stringify(seg.answers) !== JSON.stringify(q.answers)) add(n, `answer PDF=${seg.answers} app=${q.answers}`);
  let rest = seg.body.slice(`${n}.`.length);
  const take = (label, text) => {
    const t = keep(text);
    const i = rest.indexOf(t);
    if (i < 0) {
      add(n, `${label} not found in PDF text: "${text.slice(0, 80)}"`);
      return;
    }
    rest = rest.slice(0, i) + rest.slice(i + t.length);
  };
  take("question", q.question);
  q.choices.forEach((c, i) => {
    take(`choice ${i + 1}`, "①②③④⑤⑥"[i] + c);
    checkedChoices++;
  });
  q.notes.forEach((nt, i) => {
    take(`note ${i + 1}`, "■" + nt);
    checkedNotes++;
  });
  // PDF choices beyond what the app has?
  const pdfChoiceCount = [...seg.body].filter((ch) => "①②③④⑤⑥".includes(ch)).length;
  if (pdfChoiceCount < q.choices.length) add(n, `PDF shows ${pdfChoiceCount} circled markers, app has ${q.choices.length} choices`);
  if (rest.length) leftovers.push({ n, rest });
}

// Anything in the PDF not accounted for (only figure labels such as A B C D / ㉠㉡㉢㉣ are expected).
const unexpected = leftovers.filter(({ rest }) => !/^[A-DⒶ-Ⓓ㉠-㉣]+$/.test(rest));
for (const { n, rest } of unexpected) add(n, `PDF text not in app: "${rest.slice(0, 120)}"`);
const tail = K.slice(last);
if (tail.trim()) problems.push(`text after last answer: "${tail.slice(0, 80)}"`);

const report = {
  pdfPages: pdf.numPages,
  pdfAnswerMarkers: segs.length,
  appQuestions: data.length,
  checkedQuestions: Math.min(segs.length, data.length),
  checkedChoices,
  checkedNotes,
  figureLabelOnlyLeftovers: leftovers.filter((l) => !unexpected.includes(l)).map((l) => `Q${l.n}:${l.rest}`),
  problems,
};
writeFileSync(`${ROOT}/data/pdf-verification.json`, JSON.stringify(report, null, 1) + "\n");
console.log(JSON.stringify({ ...report, problems: problems.slice(0, 60) }, null, 1));
if (problems.length) process.exitCode = 1;
console.log(problems.length ? `\n${problems.length} PROBLEM(S)` : "\nEVERY QUESTION, CHOICE, NOTE AND ANSWER MATCHES THE PDF");
