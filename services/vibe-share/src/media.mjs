/** One fixed-provider URL policy for browser previews and published pages. */
export function mediaEmbedSource(provider, href) {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (provider === "youtube" && (host === "youtube.com" || host === "youtu.be")) {
      const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
      return /^[a-zA-Z0-9_-]{6,16}$/.test(id ?? "") ? "https://www.youtube-nocookie.com/embed/" + id : null;
    }
    if (provider === "vimeo" && host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^\d{4,14}$/.test(id ?? "") ? "https://player.vimeo.com/video/" + id : null;
    }
    if (provider === "spotify" && host === "open.spotify.com" && /^\/(track|album|episode|show|playlist)\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) {
      return "https://open.spotify.com/embed" + url.pathname.replace(/\/$/, "");
    }
    if (provider === "soundcloud" && host === "soundcloud.com" && url.pathname.split("/").filter(Boolean).length >= 2) {
      return "https://w.soundcloud.com/player/?url=" + encodeURIComponent(url.href) + "&auto_play=false";
    }
  } catch {}
  return null;
}
