import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const client = await readFile(new URL("./client.js", import.meta.url), "utf8");

test("browser artifact composes the experience inside the DSH module boundary", () => {
  assert.match(client.slice(0, 100), /^window\.__ModuleLoader__\.load/);
  assert.match(client, /shell\.overlay/);
  assert.match(client, /registerExperienceShell/);
  assert.ok(client.indexOf('require("react")') > client.indexOf("factory: (require)"));
});

test("generated artifact can be loaded by DSH before any browser UI renders", () => {
  let descriptor;
  runInNewContext(client, {
    window: {
      __ModuleLoader__: {
        load(value) {
          descriptor = value;
        },
      },
    },
  });
  assert.equal(descriptor.id, "dsh-vibeify");
  const exports = descriptor.factory((name) => {
    assert.equal(name, "react");
    return {};
  });
  assert.equal(typeof exports.apply, "function");
  assert.deepEqual([...exports.inject], ["connection", "sessions", "settingsScope", "slots"]);
});

test("browser artifact contains the creator-first catalogue and self-contained real photography", () => {
  for (const title of ["Anime Night, Sorted", "Skin Care, Beautifully Sorted", "Say It Better, With Experts", "Find My Look, With Receipts", "Makeup Lessons Worth Watching", "The Street-Style Edit"]) {
    assert.match(client, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(client, /data:image\/jpeg;base64,/);
  assert.match(client, /Source-led edit/);
  assert.match(client, /Photograph/);
  assert.match(client, /photographer/);
  assert.doesNotMatch(client, /AI concept art/);
  assert.match(client, /Your conversation, edited into a better view/);
  assert.match(client, /all completed chats/);
  assert.match(client, /VIBE magazine update/);
  assert.match(client, /Pull to update/);
  assert.match(client, /Stop update/);
  assert.match(client, /dsh-vibeify\.feed\.v2/);
  assert.match(client, /home-first-frame/);
  assert.match(client, /feed-restored/);
  assert.match(client, /chunk-appended/);
  assert.match(client, /questionnaire-answered/);
  assert.match(client, /magazine-update-started/);
  assert.match(client, /manual-stream-update/);
  assert.match(client, /completed threads to one local magazine/);
  assert.match(client, /sessions\.history/);
  assert.match(client, /<vibe-chunk/);
  assert.match(client, /chat-directed/);
  assert.match(client, /dsh-vibeify:chat-result/);
  assert.match(client, /textContent = "VIBE"/);
  assert.match(client, /VIBE settings/);
  assert.match(client, /Editorial direction/);
  assert.match(client, /Builders & nerds/);
  assert.match(client, /Fill the hidden reserve/);
  assert.match(client, /USD \/ day/);
  assert.match(client, /daily maximum in US dollars/);
  assert.match(client, /Reset what the editor has learned/);
  assert.match(client, /Add your own editor note/);
  assert.match(client, /AI-assisted graphic/);
  assert.match(client, /Read source/);
  assert.match(client, /dsh-vibeify-vibe-tab-style/);
  assert.match(client, /grid-auto-flow:dense/);
  assert.match(client, /overflow-x:clip/);
  assert.match(client, /overflow-wrap:anywhere/);
  assert.doesNotMatch(client, /content:"MAGAZINE"/);
  assert.match(client, /dsh-vibeify\.editorial\.v1/);
  assert.doesNotMatch(client, /Open Studio/);
  assert.doesNotMatch(client, /Create this guide/);
  assert.doesNotMatch(client, /Create my guide/);
  assert.doesNotMatch(client, /vibeify-result-panel/);
  assert.doesNotMatch(client, /Interactive answer/);
  assert.doesNotMatch(client, /Focus view/);
  assert.doesNotMatch(client, /Copy answer/);
  assert.doesNotMatch(client, /Take it further/);
  assert.doesNotMatch(client, /vfx-brief/);
  assert.doesNotMatch(client, /MIN_BACKGROUND_RUNS_PER_VISIT|buffer-low-water|shouldStartStreamRun|continuous-stream/);
});

test("new presentation retains the existing DSH safety controls", () => {
  assert.match(client, /approval stream watchdog/);
  assert.match(client, /Capability level/);
  assert.match(client, /Updates/);
  assert.match(client, /Check again/);
  assert.match(client, /Download safe updater/);
  assert.match(client, /\/vibeify-updates/);
  assert.match(client, /Queue/);
  assert.match(client, /Steer/);
});
