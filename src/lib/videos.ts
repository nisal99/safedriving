import data from "../../data/official-videos.json";

export interface OfficialVideo {
  title: string;
  /** KoROAD page for this video question. */
  page: string;
  /** Direct file link on koroad.or.kr. */
  file: string;
  format: string;
}

const videos = (data as { source: string; videos: Record<string, OfficialVideo> }).videos;

export const OFFICIAL_VIDEO_BOARD = (data as { source: string }).source;

export function officialVideo(n: number): OfficialVideo | undefined {
  return videos[String(n)];
}
