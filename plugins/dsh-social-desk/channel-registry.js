const HTTPS = /^https:\/\//i;
const MAX_TITLE = 220;
const MAX_EXCERPT = 720;

export const CHANNELS = Object.freeze({
  x: Object.freeze({ id: "x", label: "X", mode: "composer", supportsOfficialApi: true, maxLength: 280 }),
  bluesky: Object.freeze({ id: "bluesky", label: "Bluesky", mode: "composer", supportsOfficialApi: true, maxLength: 300 }),
  threads: Object.freeze({ id: "threads", label: "Threads", mode: "composer", supportsOfficialApi: true, maxLength: 500 }),
  "facebook-page": Object.freeze({ id: "facebook-page", label: "Facebook Page", mode: "composer", supportsOfficialApi: true, maxLength: 5_000 }),
  instagram: Object.freeze({ id: "instagram", label: "Instagram", mode: "composer", supportsOfficialApi: true, maxLength: 2_200, requiresImage: true }),
  reddit: Object.freeze({ id: "reddit", label: "Reddit", mode: "composer", supportsOfficialApi: false, maxLength: 10_000, community: true }),
  discord: Object.freeze({ id: "discord", label: "Discord", mode: "composer", supportsOfficialApi: false, maxLength: 2_000, community: true }),
  "youtube-community": Object.freeze({ id: "youtube-community", label: "YouTube Community", mode: "composer", supportsOfficialApi: false, maxLength: 1_500 }),
  "facebook-profile": Object.freeze({ id: "facebook-profile", label: "Facebook profile", mode: "composer", supportsOfficialApi: false, maxLength: 5_000 }),
});

function text(value, limit) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
    : "";
}

function https(value) {
  if (typeof value !== "string" || !HTTPS.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function plainMarkdown(value) {
  return text(value, 12_000)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_>#|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value) {
  const clean = plainMarkdown(value);
  const sentences = clean.match(/[^.!?]+[.!?]+/g)?.slice(0, 2).join(" ") ?? clean;
  return text(sentences, MAX_EXCERPT);
}

export function cleanSocialSnapshot(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("A cleaned Vibe article is required.");
  const title = text(input.title, MAX_TITLE);
  if (title.length < 3) throw new TypeError("The Vibe title is missing.");
  const link = https(input.contentLink?.href);
  const visualUrl = https(input.visual?.imageUrl);
  return Object.freeze({
    title,
    excerpt: excerpt(input.markdown),
    publicUrl: link,
    visual: visualUrl === null ? null : Object.freeze({
      imageUrl: visualUrl,
      sourceUrl: https(input.visual?.sourceUrl),
      alt: text(input.visual?.alt, 240),
      credit: text(input.visual?.credit, 240),
      kind: text(input.visual?.kind, 40),
    }),
  });
}

function articleLink(article) {
  return article.publicUrl ?? article.contentLink?.href ?? null;
}

function bodyFor(article) {
  return article.excerpt ?? excerpt(article.markdown);
}

function linkLine(article) {
  const link = articleLink(article);
  return link === null ? "" : `\n\n${link}`;
}

function fit(value, maxLength) {
  if (value.length <= maxLength) return value;
  const suffixMatch = value.match(/\n\nhttps:\/\/\S+$/);
  const suffix = suffixMatch?.[0] ?? "";
  const room = Math.max(20, maxLength - suffix.length - 1);
  return `${value.slice(0, room).trimEnd()}…${suffix}`;
}

export function draftForChannel(articleInput, channelId) {
  const channel = CHANNELS[channelId];
  if (channel === undefined) throw new TypeError("Unknown social channel.");
  const article = "excerpt" in articleInput ? articleInput : cleanSocialSnapshot(articleInput);
  const summary = bodyFor(article);
  const link = linkLine(article);
  let value;
  if (channelId === "reddit") {
    value = `What I built\n\n${article.title}\n\n${summary}\n\nWhat surprised me\n\nA finished article can leave the local magazine without the rest of the workspace following it.${link}\n\nQuestion for the community\n\nHow do you decide which agent work deserves a public life?`;
  } else if (channelId === "discord") {
    value = `Something worth discussing: **${article.title}**\n\n${summary}${link}\n\nI would be interested in how this lands with people building or using agent tools.`;
  } else if (channelId === "instagram") {
    value = `${article.title}\n\n${summary}${link}\n\n#Vibeify #DeepSeekHarness #OpenSource`;
  } else if (channelId === "youtube-community") {
    value = `${article.title}\n\n${summary}${link}\n\nMake your own Vibe. You stay in charge of what is shared.`;
  } else if (channelId === "x" || channelId === "bluesky") {
    value = `${article.title}\n\n${summary}${link}`;
  } else {
    value = `${article.title}\n\n${summary}${link}`;
  }
  return Object.freeze({
    channel: channelId,
    mode: channel.mode,
    text: fit(value, channel.maxLength),
    maxLength: channel.maxLength,
  });
}

export function eligibleForOfficialApi(channelId, articleInput) {
  const channel = CHANNELS[channelId];
  if (channel?.supportsOfficialApi !== true) return false;
  if (channel.requiresImage !== true) return true;
  const article = "excerpt" in articleInput ? articleInput : cleanSocialSnapshot(articleInput);
  return https(article.visual?.imageUrl) !== null;
}

export function channelList() {
  return Object.freeze(Object.values(CHANNELS));
}
