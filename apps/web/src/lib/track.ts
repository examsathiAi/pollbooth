import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SAFE = /^[a-z0-9_-]{1,30}$/;

function clean(v: string | null | undefined): string | undefined {
  const s = (v || "").toLowerCase().trim();
  return SAFE.test(s) ? s : undefined;
}

// Remember where this visit came from (first source wins for the whole session)
export function rememberSource(): void {
  try {
    const q = new URLSearchParams(window.location.search);
    const src = clean(q.get("src"));
    if (src && !sessionStorage.getItem("pb_src")) {
      sessionStorage.setItem("pb_src", src);
      const card = clean(q.get("card"));
      if (card) sessionStorage.setItem("pb_card", card);
    }
  } catch {}
}

export function currentSource(): { src?: string; card?: string } {
  try {
    return { src: sessionStorage.getItem("pb_src") || undefined, card: sessionStorage.getItem("pb_card") || undefined };
  } catch {
    return {};
  }
}

export function pollRefFromPath(path: string): string | undefined {
  const m = path.match(/^\/(?:poll|p)\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]).slice(0, 120) : undefined;
}

export function sendTrack(kind: "VISIT" | "VOTE" | "SIGNIN" | "IMPRESSION", pollRef?: string, once?: string): void {
  try {
    if (once) {
      const k = "pb_t_" + once;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    }
    const { src, card } = currentSource();
    axios.post(`${API_URL}/api/v1/track`, { kind, src, card, poll_ref: pollRef }).catch(() => {});
  } catch {}
}
