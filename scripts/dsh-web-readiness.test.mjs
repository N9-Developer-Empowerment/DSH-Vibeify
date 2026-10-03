import assert from 'node:assert/strict';
import test from 'node:test';
import { localDshUrl } from './dsh-web-readiness.mjs';
test('startup authentication stays bound to the local server and newest launch', () => {
 const logs='http://127.0.0.1:3080/?token=old\nhttp://127.0.0.1:3090/?token=other\nhttp://evil.test:3080/?token=bad\nhttp://127.0.0.1:3080/?token=new';
 assert.equal(localDshUrl(logs,3080),'http://127.0.0.1:3080/?token=new');
 assert.equal(localDshUrl('',3080),'http://127.0.0.1:3080/');
});

import http from 'node:http';
import { dshReadiness } from './dsh-web-readiness.mjs';
test('readiness verifies authenticated content, rejects a bare 401 and unreachable server', async (t) => {
  const server = http.createServer((req,res) => {
    if(req.url==='/?token=fixture') {res.writeHead(303,{'set-cookie':'session=fixture; HttpOnly','location':'/'});res.end();}
    else if(req.headers.cookie==='session=fixture') {res.writeHead(200);res.end('DSH');}
    else {res.writeHead(401);res.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const port=server.address().port;
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  assert.equal((await dshReadiness(port)).ready,false);
  const ready=await dshReadiness(port,undefined,`http://127.0.0.1:${port}/?token=fixture`);
  assert.equal(ready.ready,true);assert.equal(ready.status,200);
  await new Promise(resolve=>server.close(resolve));
  assert.equal((await dshReadiness(port)).ready,false);
});
