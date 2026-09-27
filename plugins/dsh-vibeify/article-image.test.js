import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveArticleImage, articleImageMedia, articleImageKey } from './client-src/experience/article-image.js';
import { parseArticleImages } from './client-src/experience/article-image-source.js';
import { createVisualLifecycle } from './client-src/experience/visual-lifecycle.js';
import { searchVisualForChunk } from './client-src/experience/visual-source-client.js';
import { shareSnapshotForChunk } from './client-src/experience/share-client.js';

const source = 'https://commons.wikimedia.org/wiki/File:Steam-engine_for_working_a_fan_for_withdrawing_air_from_the_mines,_1854.jpg';
const image = 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Steam-engine_for_working_a_fan_for_withdrawing_air_from_the_mines%2C_1854.jpg';
const caption = `*Image: Robert Scott Burn, 1854; public domain via [Wikimedia Commons](${source}).*`;
const article = (markdown = caption) => ({ id: 'engine', kind: 'article', source: 'fresh-stream', title: 'Will AI Replace Engineers and Mathematicians—or Make More Work?', markdown });
const candidate = { provider: 'wikimedia', imageUrl: image, sourceUrl: source, alt: 'Steam engine', creator: 'Robert Scott Burn', credit: 'Image · Robert Scott Burn · Public domain', license: 'Public domain', width: 1800, height: 2442 };
const options = (extra = {}) => ({ load: async () => true, search: async () => [candidate], generate: async () => null, ...extra });
const tick = () => new Promise(r => setTimeout(r,0));

test('one caption interpretation drives direct display, exact lookup, and body cleanup', () => {
  const parsed = parseArticleImages(`![Steam engine](${image})\n\n${caption}\n\nThe article.`);
  assert.equal(parsed.visuals[0].imageUrl,image);
  assert.deepEqual(parsed.sourceUrls,[source]);
  assert.equal(parsed.body,'The article.');
});

test('credited Commons lead wins over cached generated artwork without RPC', async () => {
  const result = await resolveArticleImage(article(`![Steam engine](${image})\n\n${caption}`), options({
    generated: { imageUrl: 'data:image/png;base64,old' },
    search: () => { throw Error('unneeded RPC'); },
    available: () => { throw Error('offline'); },
  }));
  assert.equal(result.origin,'linked');
  assert.equal(result.visual.imageUrl,image);
});

test('standalone credit resolves exact Commons and sharing keeps the selected cover', async () => {
  const result = await resolveArticleImage(article(), options({ generated: { imageUrl:'data:image/png;base64,old' } }));
  assert.equal(result.origin,'search');
  const media = articleImageMedia(result,null);
  const snapshot = shareSnapshotForChunk({chunk:article(),markdown:caption,media,inlineVisuals:[]});
  assert.equal(snapshot.visual.imageUrl,image);
  assert.equal(snapshot.visual.credit,candidate.credit);
});

test('failed exact credit never triggers unrelated stock or paid generation', async () => {
  let generated = false;
  const result = await resolveArticleImage(article(), options({
    search: async () => [{...candidate,sourceUrl:'https://commons.wikimedia.org/wiki/File:Other.jpg'}],
    generate: async () => { generated=true; return candidate; },
  }));
  assert.equal(result.visual,null); assert.equal(result.reason,'credited-image-unavailable');
  assert.equal(result.retryable,true); assert.equal(generated,false);
});

test('a failed request is an observable retryable state, not an empty successful search', async () => {
  const result = await resolveArticleImage(article(), options({search:async()=>{throw Error('RPC unavailable');}}));
  assert.equal(result.reason,'search-unavailable'); assert.equal(result.retryable,true);
});

test('a slow old image cannot block another article resolving its Commons cover', async () => {
  let release; const selected=[];
  const old=article('Old article'); old.id='old';
  const lifecycle=createVisualLifecycle({capability:async()=>true,...options({
    cached: new Map([[articleImageKey(old),{...candidate,imageUrl:'https://images.pexels.com/slow.jpg'}]]),
    load: url=>url.includes('slow')?new Promise(r=>{release=r;}):Promise.resolve(true),
    onResult:(id,result)=>{if(result.visual)selected.push(id);},
  })});
  lifecycle.enqueue([old,article()]);
  for(let i=0;i<20&&!selected.includes('engine');i++)await tick();
  assert.ok(selected.includes('engine'));
  release(true);await lifecycle.whenIdle();lifecycle.dispose();
});

test('same-ID edits discard stale in-flight results and use the changed source', async () => {
  let release;const results=[];
  const first=article();const updated=article('No public Commons source now');updated.source='chat-directed';
  const lifecycle=createVisualLifecycle({capability:async()=>true,...options({
    search:()=>new Promise(r=>{release=r;}),onResult:(_id,result)=>results.push(result),
  })});
  lifecycle.enqueue([first]); while(!release)await tick();
  lifecycle.enqueue([updated]); release([candidate]);await lifecycle.whenIdle();await tick();
  assert.equal(results.some(r=>r.visual?.imageUrl===image),false);
  assert.equal(results.at(-1).reason,'no-public-image-brief');lifecycle.dispose();
});

test('one throwing search cannot drop the rest of the image queue', async () => {
  const failed=article();failed.id='broken';const selected=[];
  const lifecycle=createVisualLifecycle({capability:async()=>true,...options({
    search:async item=>{if(item.id==='broken')throw Error('failure');return[candidate];},
    onResult:(id,result)=>{if(result.visual)selected.push(id);},
  })});
  lifecycle.enqueue([failed,article()]);await lifecycle.whenIdle();
  assert.deepEqual(selected,['engine']);lifecycle.dispose();
});


test('Commons identity tolerates equivalent URL encoding from authoritative metadata', async () => {
  const result = await resolveArticleImage(article(), options({search:async()=>[{...candidate,sourceUrl:source.replace(/_/g,'%20').replace(',', '%2C')+'#file'}]}));
  assert.equal(result.visual.imageUrl,image);
});

test('render-time failure returns to fallback and Update retries the exact source', async () => {
  const results=[];
  const lifecycle=createVisualLifecycle({capability:async()=>true,...options({onResult:(_id,result)=>results.push(result)})});
  lifecycle.enqueue([article()]); await lifecycle.whenIdle();
  assert.equal(results.at(-1).visual.imageUrl,image);
  lifecycle.failure(image); await lifecycle.whenIdle();
  assert.equal(results.at(-1).visual,null);
  lifecycle.retry(); await lifecycle.whenIdle();
  assert.equal(results.at(-1).visual.imageUrl,image); lifecycle.dispose();
});

test('transient search failure is retried with bounded backoff', async () => {
  let calls=0;const results=[];
  const lifecycle=createVisualLifecycle({capability:async()=>true,retryDelays:[1],...options({
    search:async()=>{if(++calls===1)throw Error('network');return[candidate];},
    onResult:(_id,result)=>results.push(result),
  })});
  lifecycle.enqueue([article()]); await lifecycle.whenIdle();
  for(let i=0;i<30&&!results.at(-1)?.visual;i++)await tick();
  assert.equal(calls,2);assert.equal(results.at(-1).visual.imageUrl,image);lifecycle.dispose();
});


test('provider failure crosses the RPC adapter as a failure, not an empty successful search', async () => {
  const connection={rpc:{call:async()=>({ok:true,value:{candidates:[],failedProviders:['wikimedia']}})}};
  await assert.rejects(searchVisualForChunk(connection,article()),/unavailable/);
});

test('credited articles start before optional searches in a long saved edition', async () => {
  const order=[];
  const ordinary=Array.from({length:6},(_,i)=>({...article('Public story'),id:`ordinary-${i}`}));
  const lifecycle=createVisualLifecycle({capability:async()=>true,...options({search:async chunk=>{order.push(chunk.id);return[candidate];}})});
  lifecycle.enqueue([...ordinary,article()]);await lifecycle.whenIdle();
  assert.equal(order[0],'engine');lifecycle.dispose();
});
