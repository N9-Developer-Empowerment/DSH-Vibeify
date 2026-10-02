import test from "node:test";
import assert from "node:assert/strict";
import {runInNewContext} from "node:vm";
import {cleanShareSnapshot} from "../../shared/vibe-share-contract.js";
import {renderPublicArticle} from "./src/render.mjs";
import {APP_JS} from "./src/app-source.mjs";
const value = {version:1,title:"The kettle has called a press conference",kind:"editorial",markdown:"A complete playful article.\n\n## Sources\n\n[Original](https://example.org)",publishedAt:Date.now(),visual:null,inlineVisuals:[],contentLink:null,media:null,appearance:{look:"bbc-news",palette:"news",textSize:"large",spacing:"roomy"}};
test("website look survives cleaning, persistence and public rendering", () => {
 const stored = JSON.parse(JSON.stringify(cleanShareSnapshot(value)));
 const html = renderPublicArticle(cleanShareSnapshot(stored), "https://share.codingforjustice.org.uk/a/example");
 assert.match(html, /<body data-look="bbc-news" data-palette="news" data-text-size="large" data-spacing="roomy">/);
 assert.doesNotMatch(html, /VIBE parody|independent of the BBC|<small class="look-note">/);
 assert.match(html, /--reading-width:68ch/);
 assert.match(html, /grid-column:1 \/ -1/);
});
test("private browser preview uses the same catalogue and appearance as public rendering", () => {
 const context = {document:{getElementById:()=>null},window:{addEventListener(){},parent:null},console};
 // Extract and run the shipped catalogue/normaliser, then compare with server cleaning.
 const prefix = APP_JS.slice(0, APP_JS.indexOf('function mediaEmbedSource'));
 const appearance = runInNewContext(prefix+';cleanArticleAppearance('+JSON.stringify(value.appearance)+')', context);
 assert.deepEqual(JSON.parse(JSON.stringify(appearance)), cleanShareSnapshot(value).appearance);
 assert.match(APP_JS, /document.body.dataset\[key\] = selected/);
});
