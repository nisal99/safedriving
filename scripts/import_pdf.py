#!/usr/bin/env python3
"""Import the Koroad English written-test question bank (1.pdf) into JSON + images.

Usage:
    pip install pymupdf
    python3 scripts/import_pdf.py path/to/1.pdf

Outputs:
    data/questions.json        - all questions (number, text, choices, answers, notes, images, media flags)
    public/q-images/*.png      - question images, rendered from the PDF at 2x
    data/import-report.json    - machine-readable import report (also printed)

The script is strict: it tracks question numbers in sequence and fails loudly
if anything cannot be parsed, rather than silently dropping questions.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "public" / "q-images"
EXPECTED = 1000

CIRCLED = "①②③④⑤⑥"
Q_START = re.compile(r"^\s*(\d{1,4})\s*\.\s*(.*)$")
ANSWER = re.compile(r"^\s*■\s*Answer\s*[:：]\s*(.*)$")
NOTE = re.compile(r"^\s*■\s*(.*)$")
CHOICE_SPLIT = re.compile(f"([{CIRCLED}])")

# Question wording that implies the question depends on a picture.
VISUAL_HINT = re.compile(
    r"\b(this|these|above|below|following)\s+(sign|signs|picture|pictures|photo|image|illustration|marking|markings|plate|figure|diagram|traffic lights?|signals?)\b"
    r"|\bgiven (situation|picture|image|sign)\b|\bin the (picture|photo|image|illustration)\b|\bshown (in|above|below)\b|Ⓐ",
    re.IGNORECASE,
)
VIDEO_HINT = re.compile(r"\bvideo\b|refer to the website", re.IGNORECASE)


DINGBAT_DIGITS = str.maketrans("\u2780\u2781\u2782\u2783\u2784\u2785", "①②③④⑤⑥")


def clean(s: str) -> str:
    s = s.translate(DINGBAT_DIGITS)  # Q509 uses dingbat digits for its options
    s = s.replace("\u00a0", " ").replace("\u200b", "")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def join(a: str, b: str) -> str:
    """Join wrapped PDF lines, avoiding double spaces and keeping hyphenated words intact."""
    a, b = a.rstrip(), b.strip()
    if not a:
        return b
    if not b:
        return a
    if b[:1] in ("-", "※", "•", "<", "[") or b[:2] in ("㉠ ", "㉡ ", "㉢ ", "㉣ "):
        return a + "\n" + b  # keep list/bullet structure from the PDF
    if a.endswith("-") and not a.endswith(" -"):
        return a + b
    return a + " " + b


FIGURE_LABEL = re.compile(r"^[A-DⒶ-Ⓓ㉠-㉣]$")


def iter_lines(doc):
    """Yield (page_index, y0, y1, x0, text) for every text line in reading order."""
    for pi, page in enumerate(doc):
        d = page.get_text("dict", sort=False)
        for block in d["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                text = "".join(span["text"] for span in line["spans"])
                if not text.strip():
                    continue
                x0, y0, x1, y1 = line["bbox"]
                yield pi, y0, y1, x0, text, pymupdf.Rect(line["bbox"])


def parse(doc):
    questions = []
    cur = None
    field = None  # "text" | ("choice", idx) | ("note", idx)
    expected = 1

    def finish():
        nonlocal cur
        if cur is not None:
            questions.append(cur)
        cur = None

    for pi, y0, y1, x0, raw, rect in iter_lines(doc):
        text = clean(raw)
        if cur is not None and x0 >= 420 and FIGURE_LABEL.match(text):
            # Letters printed next to pictures in the right-hand column ("A", "B", "㉠"...):
            # they belong to the figure, so they are rendered into the image instead of the text.
            cur.setdefault("_labels", []).append((pi, rect))
            continue
        m_ans = ANSWER.match(text)
        if m_ans and cur is not None:
            nums = [int(n) for n in re.findall(r"\d+", m_ans.group(1))]
            cur["answers"] = nums
            cur["_end"] = (pi, y1)
            finish()
            field = None
            continue

        m_q = Q_START.match(text)
        if m_q and int(m_q.group(1)) == expected and (cur is None):
            cur = {
                "number": expected,
                "question": clean(m_q.group(2)),
                "choices": [],
                "notes": [],
                "answers": [],
                "_start": (pi, y0),
            }
            expected += 1
            field = "text"
            continue

        if cur is None:
            # Text outside a question box (should not happen); record for the report.
            unattached.append((pi + 1, text))
            continue

        m_note = NOTE.match(text)
        if m_note:
            cur["notes"].append(clean(m_note.group(1)))
            field = ("note", len(cur["notes"]) - 1)
            continue

        if any(c in text for c in CIRCLED):
            parts = CHOICE_SPLIT.split(text)
            lead = parts[0]
            if lead.strip():
                append_to(cur, field, lead)
            for i in range(1, len(parts), 2):
                marker, body = parts[i], parts[i + 1] if i + 1 < len(parts) else ""
                idx = CIRCLED.index(marker)
                if idx != len(cur["choices"]):
                    # Circled digit used inside text (e.g. a reference to option ①), not a new option.
                    append_to(cur, field, marker + body)
                    continue
                cur["choices"].append(clean(body))
                field = ("choice", idx)
            continue

        append_to(cur, field, text)

    if cur is not None:
        questions.append(cur)  # unterminated (reported by validation)
    return questions


def append_to(cur, field, text):
    if field == "text" or field is None:
        cur["question"] = join(cur["question"], text)
    elif field[0] == "choice":
        cur["choices"][field[1]] = join(cur["choices"][field[1]], text)
    elif field[0] == "note":
        cur["notes"][field[1]] = join(cur["notes"][field[1]], text)


unattached: list[tuple[int, str]] = []


def merge_rects(rects):
    rects = [pymupdf.Rect(r) for r in rects]
    merged = True
    while merged:
        merged = False
        out = []
        while rects:
            r = rects.pop()
            for i, o in enumerate(out):
                if (r & o).get_area() > 0 or r.intersects(o):
                    out[i] = o | r
                    merged = True
                    break
            else:
                out.append(r)
        rects = out
    return sorted(rects, key=lambda r: (r.y0, r.x0))


def trim_white(page, r, dpi=144, threshold=245, margin=4):
    """Shrink a clip rectangle to its non-white content (figures often sit in padded table cells)."""
    pix = page.get_pixmap(clip=r, dpi=dpi, alpha=False, colorspace=pymupdf.csGRAY)
    w, h, data = pix.width, pix.height, pix.samples
    stride = pix.stride
    rows = [i for i in range(h) if min(data[i * stride : i * stride + w]) < threshold]
    cols = [j for j in range(w) if min(data[j : h * stride : stride]) < threshold]
    if not rows or not cols:
        return r
    scale = r.width / w
    return pymupdf.Rect(
        r.x0 + max(0, cols[0] - margin) * scale,
        r.y0 + max(0, rows[0] - margin) * scale,
        r.x0 + min(w, cols[-1] + 1 + margin) * scale,
        r.y0 + min(h, rows[-1] + 1 + margin) * scale,
    )


def overlaps_text(page, r):
    """True when an image's box covers real text (an oversized picture frame), so a page crop would include words."""
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            text = clean("".join(span["text"] for span in line["spans"]))
            if not text or FIGURE_LABEL.match(text):
                continue
            lr = pymupdf.Rect(line["bbox"])
            # Ignore stray glyphs in the table column gutter; they are clamped away later.
            if (lr & r).get_area() > 20 and lr.x1 > 432:
                return True
    return False


def visible_clips(page):
    """Clip rectangles on the page (some pictures are larger images cropped by a clipping path)."""
    full = page.rect.get_area() * 0.9
    return [pymupdf.Rect(d["scissor"]) for d in page.get_drawings(extended=True) if d["type"] == "clip" and pymupdf.Rect(d["scissor"]).get_area() < full]


def clip_to_visible(r, clips):
    """Intersect an image box with the clip that crops it, so only the visible part is rendered."""
    best = None
    for c in clips:
        inter = r & c
        if inter.is_empty or inter.get_area() < 0.5 * c.get_area():
            continue  # clip is mostly outside this image: it belongs to something else
        if best is None or inter.get_area() > (r & best).get_area():
            best = c
    return (r & best) if best is not None else r


def rect_distance(a, b):
    dx = max(a.x0 - b.x1, b.x0 - a.x1, 0)
    dy = max(a.y0 - b.y1, b.y0 - a.y1, 0)
    return (dx * dx + dy * dy) ** 0.5


overlap_warnings: list[dict] = []


def assign_images(doc, questions):
    """Assign each raster image on a page to the question box whose vertical span contains it."""
    by_page = {}
    for q in questions:
        if "_end" not in q:
            continue
        (sp, sy), (ep, ey) = q["_start"], q["_end"]
        for p in range(sp, ep + 1):
            top = sy - 40 if p == sp else 0  # images may sit slightly above the first text line
            bottom = ey if p == ep else 1e9
            by_page.setdefault(p, []).append((top, bottom, q))

    unassigned = []
    for pi, page in enumerate(doc):
        rects_for_q = {}
        clips = visible_clips(page)
        for info in page.get_image_info(xrefs=True):
            r = clip_to_visible(pymupdf.Rect(info["bbox"]) & page.rect, clips)
            if r.is_empty or r.width < 8 or r.height < 8:
                continue
            cy = (r.y0 + r.y1) / 2
            owner = None
            for top, bottom, q in by_page.get(pi, []):
                if top <= cy <= bottom:
                    owner = q
                    break
            if owner is None:
                # Fall back to the nearest question box on the page above the image.
                cands = [(cy - bottom, q) for top, bottom, q in by_page.get(pi, []) if bottom <= cy]
                cands += [(top - cy, q) for top, bottom, q in by_page.get(pi, []) if top >= cy]
                if cands:
                    owner = min(cands, key=lambda t: t[0])[1]
                    unassigned.append({"page": pi + 1, "bbox": [round(v) for v in r], "assignedTo": owner["number"], "note": "nearest box"})
                else:
                    unassigned.append({"page": pi + 1, "bbox": [round(v) for v in r], "assignedTo": None})
                    continue
            if overlaps_text(page, r):
                overlap_warnings.append({"page": pi + 1, "question": owner["number"], "bbox": [round(v) for v in r]})
            rects_for_q.setdefault(owner["number"], (owner, []))[1].append(r)

        for num, (q, rects) in rects_for_q.items():
            labels = [lr for lp, lr in q.get("_labels", []) if lp == pi]
            if labels:
                # A labelled figure (e.g. signs A-D or warning lights ㉠-㉣): render the whole
                # grid, letters included, as one image so the labels stay next to their pictures.
                whole = rects[0]
                for r in rects[1:] + labels:
                    whole = whole | r
                rects[:] = [whole + (-4, -4, 4, 4)]
            if min(r.x0 for r in rects) >= 400:
                # Figures in the right-hand table column: never bleed across the column divider.
                for r in rects:
                    r.x0 = max(r.x0, 432)

        for num, (q, rects) in rects_for_q.items():
            for r in merge_rects(rects):
                idx = len(q.setdefault("images", [])) + 1
                name = f"q{num:04d}-{idx}.jpg"
                pix = page.get_pixmap(clip=trim_white(page, r), dpi=144, alpha=False)
                pix.save(IMG_DIR / name, jpg_quality=82)
                q["images"].append({"src": f"/q-images/{name}", "width": pix.width, "height": pix.height})

    return unassigned


def kind_of(q, is_video):
    """Question type, matching the categories used by the real test."""
    if is_video:
        return "video"  # 동영상형
    if q.get("images"):
        # Photo / illustration situations have 5 options and 2 answers; signs and plates have 4 options.
        return "situation" if len(q["choices"]) == 5 or len(q["answers"]) == 2 else "picture"
    return "text"  # 문장형


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pdf = Path(sys.argv[1])
    doc = pymupdf.open(pdf)
    DATA_DIR.mkdir(exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    for old in list(IMG_DIR.glob("*.png")) + list(IMG_DIR.glob("*.jpg")):
        old.unlink()

    questions = parse(doc)
    unassigned_images = assign_images(doc, questions)

    out = []
    image_warnings = []
    for q in questions:
        text_all = q["question"] + " " + " ".join(q["notes"])
        if not q.get("images") and VISUAL_HINT.search(text_all) and not VIDEO_HINT.search(text_all):
            image_warnings.append(q["number"])
        needs_video = bool(VIDEO_HINT.search(q["question"]))
        images = q.get("images", [])
        media = None
        if needs_video:
            media = {
                "type": "video",
                "reason": "This question refers to a video on the official website. The video is not included in the PDF.",
            }
        out.append(
            {
                "number": q["number"],
                "question": q["question"],
                "choices": q["choices"],
                "answers": q["answers"],
                "notes": q["notes"],
                "images": images,
                "kind": kind_of(q, needs_video),
                "missingMedia": media,
            }
        )

    (DATA_DIR / "questions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    report = {
        "source": pdf.name,
        "pages": doc.page_count,
        "questionsParsed": len(out),
        "imageFiles": sum(len(q["images"]) for q in out),
        "questionsWithImages": sum(1 for q in out if q["images"]),
        "unassignedImages": unassigned_images,
        "unattachedText": [{"page": p, "text": t} for p, t in unattached],
        "possiblyMissingImages": image_warnings,
        "imagesOverlappingText": overlap_warnings,
    }
    (DATA_DIR / "import-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))
    print("Now run: npm run validate")


if __name__ == "__main__":
    main()
