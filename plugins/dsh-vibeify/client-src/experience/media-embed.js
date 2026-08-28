function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch { return null; }
}

export function linksFromMarkdown(markdown) {
  const matches = String(markdown ?? "").matchAll(/\[[^\]]+\]\((https:\/\/[^\s)]+)\)/g);
  return Object.freeze([...matches].map((match) => match[1]).slice(0, 12));
}

export function clickToLoadMedia(markdown) {
  for (const raw of linksFromMarkdown(markdown)) {
    const url = httpsUrl(raw);
    if (url === null) continue;
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be") {
      const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
      if (/^[a-zA-Z0-9_-]{6,16}$/.test(id ?? "")) return Object.freeze({ kind: "video", label: "Play video", src: `https://www.youtube-nocookie.com/embed/${id}`, href: url.href });
    }
    if (host === "open.spotify.com" && /^\/(track|album|episode|show|playlist)\/[a-zA-Z0-9]+/.test(url.pathname)) {
      return Object.freeze({ kind: "music", label: "Open Spotify player", src: `https://open.spotify.com/embed${url.pathname}`, href: url.href });
    }
    if (host === "soundcloud.com") {
      return Object.freeze({ kind: "music", label: "Open SoundCloud player", src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&auto_play=false`, href: url.href });
    }
    if (host === "vimeo.com" && /^\/\d+/.test(url.pathname)) {
      return Object.freeze({ kind: "video", label: "Play video", src: `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean)[0]}`, href: url.href });
    }
  }
  return null;
}
