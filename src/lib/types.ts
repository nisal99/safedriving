/** Question type, mirroring the categories of the real Korean written test. */
export type QuestionKind =
  | "text" // 문장형: text-only questions
  | "picture" // 안전표지 등: sign / plate / figure with 4 options
  | "situation" // 사진형·일러스트형: photo or illustration, 5 options, 2 answers
  | "video"; // 동영상형: needs a video that is not in the PDF

export interface QuestionImage {
  src: string;
  width: number;
  height: number;
}

export interface MissingMedia {
  type: "video";
  reason: string;
}

export interface Question {
  /** Original number from the PDF (1–1000). */
  number: number;
  question: string;
  choices: string[];
  /** 1-based indexes of the correct choices, exactly as supplied in the PDF. */
  answers: number[];
  /** "■" situation notes printed beside photos / illustrations. */
  notes: string[];
  images: QuestionImage[];
  kind: QuestionKind;
  missingMedia: MissingMedia | null;
}

/** 1-based choice indexes the user picked. */
export type Selection = number[];
