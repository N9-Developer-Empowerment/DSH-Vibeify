# Article images

`resolveArticleImage` in `plugins/dsh-vibeify/client-src/experience/article-image.js` is the single asynchronous cover-selection entry point. Change selection order or failure policy there; do not add a second chooser in the renderer, cache, provider adapter or sharing code.

## Flow

1. `parseArticleImages` reads direct image markup and attribution once. One caption parser handles linked credits, standalone Commons credits and credits whose creator or licence is outside the link. Its output also supplies body cleanup, inline image parsing and public lookup briefs.
2. The resolver tries the credited direct image first, even offline. Every selected image must decode at a usable size (480 × 240 minimum).
3. For an explicit Commons File credit, it restores a matching saved image or resolves that exact file using authoritative Commons metadata. Equivalent URL escaping is accepted. Unrelated stock and generated pictures cannot override this choice.
4. Without an exact Commons choice, it tries saved generated artwork, saved photography, public image search and finally optional bounded generation. Ordinary private Chat never supplies its title or prose to these services.
5. Until a candidate loads, the card keeps its credited bundled fallback. A failed exact image leaves a visible retry message. It does not pretend the illustration is the credited Commons image.
6. Rendering and sharing consume the same selected media record, including creator, licence and source. Extra inline images use the same markup parser; they are not separate cover searches.

## Responsibilities

| Module | Responsibility |
| --- | --- |
| `article-image-source.js` | Markdown, captions, source identity and accepted direct image links |
| `article-image.js` | Selection order, exact-source protection, failure results and presentation adapter |
| `visual-lifecycle.js` | Two queue workers, credited-image priority, cancellation, cache ownership and bounded retry scheduling |
| `visual-source-client.js` | RPC, validated provider results, storage and browser image decoding |
| `dsh-visuals/visual-service.js` | Authoritative provider metadata; exact-only requests never broaden |
| `shared/image-policy.js` | Reusable image families shared with the sharing boundary |
| `shell.jsx` | Displays the result and reports later image failures |

Cache keys include article content as well as its ID. An edit therefore invalidates the old choice, and stale in-flight work cannot overwrite the edited article. Legacy ID-only entries cannot mask new credits. Existing generated artwork may need resolving again after this cache-key change; generation remains subject to existing limits.

Missing capability and transient search failures receive bounded retries. Update explicitly retries failures, including a previously broken image URL. A broken image or request for one article must not abort the rest of the queue. Service failures and successful searches with no usable image remain distinct results.

## Regression evidence

`article-image.test.js` includes the Robert Scott Burn steam-engine caption reported by the user. It covers direct display, standalone exact lookup, equivalent URLs, sharing continuity, generated-cache precedence, render-time failure, explicit retry, stale edits, queue isolation and transient retry. `visual-service.test.js` proves exact misses and network failures never invoke broad search. Existing feed, lifecycle, client and sharing tests guard the surrounding contracts.

These deterministic tests establish selection behavior. Browser decoding and the installed DSH bundle still need live verification before declaring the reported article fixed on a particular machine.
