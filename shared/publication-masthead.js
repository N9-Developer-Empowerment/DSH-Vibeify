/** Stable publication identities. The saved look selects the brand on every surface. */
export const PUBLICATION_BRANDS = Object.freeze({
  vibe: Object.freeze({ id: "vibe-magazine-v1", name: "VIBE", tagline: "People. Culture. A little intrigue.", section: "", treatment: "magazine" }),
  "bbc-news": Object.freeze({ id: "vibe-news-v1", name: "VIBE", tagline: "", section: "NEWS", treatment: "news" }),
});

export function publicationBrand(look) {
  return PUBLICATION_BRANDS[Object.hasOwn(PUBLICATION_BRANDS, look) ? look : "vibe"];
}

/** Only fixed catalogue text enters this markup; reader-supplied strings never do. */
export function renderPublicationMasthead(look) {
  const brand = publicationBrand(look);
  const wordmark = brand.treatment === "news"
    ? Array.from(brand.name, (letter) => `<span class="vibe-brand-tile">${letter}</span>`).join("")
    : brand.name;
  return `<span class="vibe-masthead" data-brand="${brand.id}" data-treatment="${brand.treatment}"><span class="vibe-brand-wordmark" aria-label="${brand.name}">${wordmark}</span>${brand.tagline ? `<span class="vibe-brand-tagline">${brand.tagline}</span>` : ""}${brand.section ? `<span class="vibe-brand-section">${brand.section}</span>` : ""}</span>`;
}

/** Shared geometry and typography keep local, preview and published branding aligned. */
export const PUBLICATION_MASTHEAD_STYLES = `
.vibe-masthead { display:block; width:100%; text-align:left; color:var(--ink); background:var(--page); }
.vibe-brand-wordmark { display:block; }
.vibe-masthead[data-treatment="magazine"] { padding:24px 20px 22px; text-align:center; border-bottom:1px solid var(--edge); }
.vibe-masthead[data-treatment="magazine"] .vibe-brand-wordmark { font-family:Georgia,"Times New Roman",serif; font-size:clamp(84px,11vw,154px); font-weight:700; font-style:italic; letter-spacing:-.085em; line-height:.9; padding-right:.085em; }
.vibe-brand-tagline { display:block; margin-top:16px; color:var(--accent); font-family:Inter,system-ui,sans-serif; font-size:11px; font-weight:750; letter-spacing:.18em; line-height:1.5; text-transform:uppercase; }
.vibe-masthead[data-treatment="news"] .vibe-brand-wordmark { display:flex; gap:7px; padding:20px clamp(20px,5vw,72px); }
.vibe-brand-tile { display:grid; place-items:center; width:44px; height:44px; background:var(--ink); color:var(--page); font-family:Arial,Helvetica,sans-serif; font-size:33px; font-weight:800; line-height:1; }
.vibe-brand-section { display:block; padding:15px clamp(20px,5vw,72px); color:var(--page); background:var(--accent); font-family:Arial,Helvetica,sans-serif; font-size:clamp(32px,4vw,48px); font-weight:750; line-height:1; letter-spacing:-.025em; }
@media(max-width:560px) { .vibe-masthead[data-treatment="magazine"] { padding:20px 14px; } .vibe-brand-tagline { font-size:9px; letter-spacing:.12em; margin-top:12px; } .vibe-masthead[data-treatment="news"] .vibe-brand-wordmark { padding:16px; } .vibe-brand-section { padding:14px 16px; } .vibe-brand-tile { width:35px; height:35px; font-size:26px; } }
`;

export function publicationMastheadRuntimeSource() {
  return `const PUBLICATION_BRANDS = ${JSON.stringify(PUBLICATION_BRANDS)};\n${publicationBrand.toString()}\n${renderPublicationMasthead.toString()}`;
}
