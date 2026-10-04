/** Stable publication identities. The saved look selects the brand on every surface. */
export const PUBLICATION_BRANDS = Object.freeze({
  vibe: Object.freeze({ id: "vibe-magazine-v1", name: "VIBE", tagline: "People. Culture. A little intrigue.", section: "", treatment: "magazine" }),
  "bbc-news": Object.freeze({ id: "vibe-news-v1", name: "VIBE", tagline: "", section: "NEWS", treatment: "news" }),
});

export const PUBLICATION_MOOD_BRANDS = Object.freeze({
  classic: Object.freeze({ id: "vibe-classic-v1", tagline: "", label: "CLASSIC" }),
  "lilac-pop": Object.freeze({ id: "vibe-lilac-pop-v1", tagline: "Pop. Play. Main-character colour.", label: "LILAC POP" }),
  "cherry-soda": Object.freeze({ id: "vibe-cherry-soda-v1", tagline: "Life, style and the sweetest throwbacks.", label: "CHERRY SODA" }),
  "matcha-break": Object.freeze({ id: "vibe-matcha-break-v1", tagline: "Good taste. Better pace.", label: "MATCHA BREAK" }),
  "after-dark": Object.freeze({ id: "vibe-after-dark-v1", tagline: "Style, desire and chosen scenes.", label: "AFTER DARK" }),
});

export function publicationBrand(look) {
  return PUBLICATION_BRANDS[Object.hasOwn(PUBLICATION_BRANDS, look) ? look : "vibe"];
}

/** Only fixed catalogue text enters this markup; reader-supplied strings never do. */
export function renderPublicationMasthead(look, mood = "classic") {
  const base = publicationBrand(look);
  const moodId = Object.hasOwn(PUBLICATION_MOOD_BRANDS, mood) ? mood : "classic";
  if (moodId === "classic") {
    const wordmark = base.treatment === "news"
      ? Array.from(base.name, (letter) => `<span class="vibe-brand-tile">${letter}</span>`).join("")
      : base.name;
    return `<span class="vibe-masthead" data-brand="${base.id}" data-treatment="${base.treatment}"><span class="vibe-brand-wordmark" aria-label="${base.name}">${wordmark}</span>${base.tagline ? `<span class="vibe-brand-tagline">${base.tagline}</span>` : ""}${base.section ? `<span class="vibe-brand-section">${base.section}</span>` : ""}</span>`;
  }
  const moodBrand = PUBLICATION_MOOD_BRANDS[moodId];
  const brand = base.treatment === "news"
    ? { ...base, id: `${base.id}-${moodBrand.id}`, tagline: moodBrand.tagline }
    : { id: moodBrand.id, name: base.name, tagline: moodBrand.tagline, section: moodBrand.label, treatment: moodId };
  const wordmark = brand.treatment === "news"
    ? Array.from(brand.name, (letter) => `<span class="vibe-brand-tile">${letter}</span>`).join("")
    : brand.name;
  const moodLabel = base.treatment === "news" ? `<span class="vibe-brand-mood">${moodBrand.label}</span>` : "";
  return `<span class="vibe-masthead" data-brand="${brand.id}" data-treatment="${brand.treatment}"><span class="vibe-brand-wordmark" aria-label="${brand.name}">${wordmark}</span>${brand.tagline ? `<span class="vibe-brand-tagline">${brand.tagline}</span>` : ""}${brand.section ? `<span class="vibe-brand-section">${brand.section}</span>` : ""}${moodLabel}</span>`;
}

/** Shared geometry and typography keep local, preview and published branding aligned. */
export const PUBLICATION_MASTHEAD_STYLES = `
.vibe-masthead { display:block; width:100%; text-align:left; color:var(--ink); background:var(--page); }
.vibe-brand-wordmark { display:block; }
.vibe-masthead[data-treatment="magazine"] { padding:24px 20px 22px; text-align:center; border-bottom:1px solid var(--edge); }
.vibe-masthead[data-treatment="magazine"] .vibe-brand-wordmark { font-family:Georgia,"Times New Roman",serif; font-size:clamp(84px,11vw,154px); font-weight:700; font-style:italic; letter-spacing:-.085em; line-height:.9; padding-right:.085em; }
.vibe-brand-tagline { display:block; margin-top:16px; color:var(--accent); font-family:Inter,system-ui,sans-serif; font-size:11px; font-weight:750; letter-spacing:.18em; line-height:1.5; text-transform:uppercase; }
.vibe-masthead:is([data-treatment="lilac-pop"],[data-treatment="cherry-soda"],[data-treatment="matcha-break"],[data-treatment="after-dark"]) { padding:24px clamp(18px,5vw,72px) 20px; border-bottom:1px solid var(--edge); }
.vibe-masthead:is([data-treatment="lilac-pop"],[data-treatment="cherry-soda"],[data-treatment="matcha-break"],[data-treatment="after-dark"]) .vibe-brand-wordmark { font-size:clamp(64px,10vw,132px); font-weight:850; letter-spacing:-.075em; line-height:.84; }
.vibe-masthead:is([data-treatment="lilac-pop"],[data-treatment="cherry-soda"]) .vibe-brand-wordmark { font-family:Georgia,"Times New Roman",serif; font-style:italic; }
.vibe-masthead[data-treatment="matcha-break"] .vibe-brand-wordmark { font-family:"Avenir Next",Avenir,Inter,sans-serif; font-weight:600; letter-spacing:-.06em; }
.vibe-masthead[data-treatment="after-dark"] .vibe-brand-wordmark { font-family:Didot,"Bodoni 72",Georgia,serif; font-weight:600; letter-spacing:.02em; }
.vibe-masthead:is([data-treatment="lilac-pop"],[data-treatment="cherry-soda"],[data-treatment="matcha-break"],[data-treatment="after-dark"]) .vibe-brand-section { display:inline-block; margin-top:16px; padding:7px 12px; color:var(--page); background:var(--accent); font-size:12px; letter-spacing:.2em; }
.vibe-masthead[data-treatment="news"] .vibe-brand-wordmark { display:flex; gap:7px; padding:20px clamp(20px,5vw,72px); }
.vibe-brand-tile { display:grid; place-items:center; width:44px; height:44px; background:var(--ink); color:var(--page); font-family:Arial,Helvetica,sans-serif; font-size:33px; font-weight:800; line-height:1; }
.vibe-brand-section { display:block; padding:15px clamp(20px,5vw,72px); color:var(--page); background:var(--accent); font-family:Arial,Helvetica,sans-serif; font-size:clamp(32px,4vw,48px); font-weight:750; line-height:1; letter-spacing:-.025em; }
.vibe-brand-mood { display:block; padding:9px clamp(20px,5vw,72px); color:var(--ink); border-bottom:1px solid var(--edge); font-family:Arial,Helvetica,sans-serif; font-size:11px; font-weight:750; letter-spacing:.2em; }
@media(max-width:560px) { .vibe-masthead[data-treatment="magazine"] { padding:20px 14px; } .vibe-brand-tagline { font-size:9px; letter-spacing:.12em; margin-top:12px; } .vibe-masthead[data-treatment="news"] .vibe-brand-wordmark { padding:16px; } .vibe-brand-section { padding:14px 16px; } .vibe-brand-tile { width:35px; height:35px; font-size:26px; } }
`;

export function publicationMastheadRuntimeSource() {
  return `const PUBLICATION_BRANDS = ${JSON.stringify(PUBLICATION_BRANDS)};\nconst PUBLICATION_MOOD_BRANDS = ${JSON.stringify(PUBLICATION_MOOD_BRANDS)};\n${publicationBrand.toString()}\n${renderPublicationMasthead.toString()}`;
}
