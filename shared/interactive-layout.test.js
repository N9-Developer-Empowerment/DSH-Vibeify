import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {fitInteractiveContent, installInteractiveSizing} from './interactive-layout.js';

for (const limit of [700,500]) test(`a ${limit}px authored app scales to available width and reports its full height`, () => {
  const root={};const messages=[];const listeners={};
  const body={style:{},querySelector:()=>root,scrollHeight:560,getBoundingClientRect:()=>({height:560*Number(body.style.zoom||1)})};
  const doc={body,documentElement:{clientWidth:limit*2}};
  runInNewContext(`(${fitInteractiveContent})();`,{document:doc,getComputedStyle:node=>node===root?{maxWidth:`${limit}px`}:{paddingLeft:'0px',paddingRight:'0px'},ResizeObserver:class{observe(){}},parent:{postMessage:m=>messages.push(m)},window:{addEventListener:(k,f)=>listeners[k]=f}});
  assert.equal(body.style.zoom,'2');assert.equal(body.style.width,`${limit}px`);assert.equal(messages.at(-1).height,1120);
  doc.documentElement.clientWidth=350;listeners.resize();
  assert.equal(body.style.zoom,'1');assert.equal(body.style.width,'100%');
});

test('only the displayed sandbox frame may resize itself; heights are bounded',()=>{
  const child={postMessage(){}};const frame={contentWindow:child,style:{}};const listeners={};
  runInNewContext(`(${installInteractiveSizing})();`,{document:{querySelectorAll:()=>[frame]},window:{addEventListener:(k,f)=>listeners[k]=f}});
  listeners.message({source:{},data:{type:'vibe:interactive-size',height:1200}});assert.equal(frame.style.height,undefined);
  listeners.message({source:child,data:{type:'vibe:interactive-size',height:1200}});assert.equal(frame.style.height,'1200px');
  listeners.message({source:child,data:{type:'vibe:interactive-size',height:999999}});assert.equal(frame.style.height,'6000px');
});
