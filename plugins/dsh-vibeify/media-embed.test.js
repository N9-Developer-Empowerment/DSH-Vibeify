import assert from "node:assert/strict";
import test from "node:test";

import { clickToLoadMedia, linksFromMarkdown } from "./client-src/experience/media-embed.js";

test("extracts bounded HTTPS markdown links", () => {
  assert.deepEqual(linksFromMarkdown("[one](https://example.com/a) [two](http://example.com/b)"), ["https://example.com/a"]);
});

test("creates privacy-aware players without autoplay", () => {
  assert.deepEqual(clickToLoadMedia("[watch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)"), {
    kind: "video", label: "Play video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.match(clickToLoadMedia("[listen](https://soundcloud.com/example/song)").src, /auto_play=false/);
});
