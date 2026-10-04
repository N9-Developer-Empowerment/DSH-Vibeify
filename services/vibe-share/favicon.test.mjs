import test from 'node:test';
import assert from 'node:assert/strict';
import {faviconPath, faviconSvg} from './src/favicon.mjs';
import {handleRequest} from './src/worker.mjs';
import {renderNewPage, renderNotFound} from './src/render.mjs';

test('preview and unavailable pages have a same-origin branded SVG icon', () => {
 for (const html of [renderNewPage(),renderNotFound()]) assert.match(html, /id="vibe-favicon" rel="icon" type="image\/svg\+xml" sizes="any" href="\/favicon.svg\?v=1/);
});
test('favicon route normalises appearance, supports HEAD and returns inert cacheable SVG', async () => {
 const url='https://example.org/favicon.svg?look=bbc-news&palette=news&mood=after-dark';
 const response=await handleRequest(new Request(url));
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/image\/svg\+xml/);
 assert.match(response.headers.get('cache-control'),/max-age/);
 assert.equal(await response.text(),faviconSvg({look:'bbc-news',palette:'news',mood:'after-dark'}));
 const head=await handleRequest(new Request(url,{method:'HEAD'}));assert.equal(await head.text(),'');
 const hostile={look:'<script>',palette:'" onload="alert(1)',mood:'../../private'};
 assert.equal(faviconSvg(hostile),faviconSvg(null));
 assert.equal(faviconPath(hostile),faviconPath(null));
});
