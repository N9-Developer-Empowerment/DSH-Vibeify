---
name: dsh-visuals
description: Configure, diagnose, or explain the optional DSH Visuals plugin for Vibeify, including Wikimedia Commons, Openverse, Pexels, Pixabay, image provenance, public-sharing suitability, and local credential entry. Use when Vibeify needs better relevant images or its Pexels/Pixabay source status needs checking. Do not expose keys, treat search labels as licences, reuse a public-share image, or send private article text to an image provider.
---

# DSH Visuals

Treat this plugin as an optional public-image capability for Vibeify. Vibeify must retain its unique local typographic fallback whenever the plugin is absent, all providers fail, or no relevant reusable photograph is found.

Keep these boundaries:

- Send only a short, reader-facing public image-search phrase. Never send prompts, private article bodies, attachments, account data, preferences, local history, credentials, or current private images.
- Wikimedia Commons and Openverse require no key. Openverse is discovery only: retain the original landing page and licence, and reject a result whose reusable licence or original source is unclear.
- Pexels resolves `PEXELS_API_KEY`; Pixabay resolves `PIXABAY_API_KEY`. Keys live in DSH's credential provider, are resolved per operation, and must never appear in settings, logs, RPC results, shared snapshots, commits, screenshots, or support reports.
- Keep the image URL, original source page, creator, licence, dimensions, provider, and relevance score together. Do not invent missing credit or licence data.
- Prefer an exact named-person, place, object, work, or event match. A decorative mood match is not a documentary image.
- A screenshot does not remove the source's copyright. Use it only where quotation/fair-dealing analysis genuinely supports it, and label it as a screenshot.
- Public sharing may use only a fresh visual that has not appeared on another public Vibe article. Keep the original source credit after any permitted local copy or share-service ingestion.

Use DSH **Settings → Images** to see source status and enter Pexels or Pixabay keys. A blank key field never clears a stored key; removal is a separate explicit action.
