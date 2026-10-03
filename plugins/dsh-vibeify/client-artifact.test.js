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
  assert.deepEqual([...exports.inject], ["connection", "remote", "remote.session", "remote.credentials", "sessions", "configForms", "slots"]);
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
  assert.match(client, /People\. Stories\. Something worth your time/);
  assert.match(client, /Good choice\. You installed the part where AI becomes worth looking at/);
  assert.match(client, /DeepSeek Harness is the stage manager/);
  assert.match(client, /VIBE is a plugin/);
  assert.match(client, /Open source means the exit is visible/);
  assert.match(client, /Ask Chat to make a Vibe/);
  assert.match(client, /Update my magazine/);
  assert.match(client, /vibe-magazine-v1/);
  assert.match(client, /vibe-news-v1/);
  assert.match(client, /Publication masthead/);
  assert.match(client, /VIBE magazine update/);
  assert.match(client, /Pull to update/);
  assert.match(client, /Stop update/);
  assert.match(client, /dsh-vibeify\.feed\.v2/);
  assert.match(client, /home-first-frame/);
  assert.match(client, /feed-restored/);
  assert.match(client, /chunk-appended/);
  assert.doesNotMatch(client, /saveStreamAnswer\(browserStorage\(\), chunkId, label\)/);
  assert.match(client, /magazine-update-started/);
  assert.match(client, /manual-stream-update/);
  assert.match(client, /completed threads to one local magazine/);
  assert.match(client, /function createSessionApi/);
  assert.match(client, /sessionApi\.history/);
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
  assert.match(client, /Preview and share/);
  assert.match(client, /data-media-provider/);
  assert.match(client, /vfx-player\[data-media-provider="soundcloud"\][^}]*height:166px/);
  assert.match(client, /share\.codingforjustice\.org\.uk/);
  assert.match(client, /vibe-share:snapshot/);
  assert.doesNotMatch(client, /\/api\/articles/);
  assert.match(client, /dsh-vibeify-vibe-tab-style/);
  assert.match(client, /grid-auto-flow:row/);
  assert.match(client, /overflow-x:clip/);
  assert.match(client, /overflow-wrap:anywhere/);
  assert.match(client, /\.vfx-chunk h2\s*\{[^}]*overflow-wrap:normal;[^}]*word-break:normal;[^}]*hyphens:none;/);
  assert.doesNotMatch(client, /\.vfx-chunk h2\s*\{[^}]*overflow-wrap:anywhere/);
  assert.match(client, /@media \(max-width:1180px\)[^{]*\{[^}]*\.vfx-chunk\.is-hero\s*\{\s*display:block;/);
  assert.match(client, /className = "vfx-table-scroll"/);
  assert.match(client, /data-has-table/);
  assert.match(client, /\.vfx-chunk\[data-has-table="true"\]\.is-hero\s*\{[^}]*display:block;/);
  assert.match(client, /\.vfx-table-scroll\s*\{[^}]*overflow-x:auto;/);
  assert.match(client, /\.vfx-table-scroll table\s*\{[^}]*min-width:680px;/);
  assert.match(client, /\.vfx-markdown th,\.vfx-markdown td\s*\{[^}]*overflow-wrap:normal;[^}]*word-break:normal;[^}]*hyphens:none;/);
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

test("the magazine artifact has no preference-questionnaire renderer", () => {
  assert.doesNotMatch(client, /function Questionnaire/);
  assert.match(client, /newestFirst\(chunks\)\.filter\(\(\{ kind \}\) => kind !== "questionnaire"\)/);
});

test("new presentation retains the existing DSH safety controls", () => {
  assert.match(client, /approval stream watchdog/);
  assert.match(client, /Model and thinking effort/);
  assert.match(client, /Updates/);
  assert.match(client, /Check again/);
  assert.match(client, /report\.updater\.label/);
  assert.match(client, /Finish active tasks before activating an update/);
  assert.match(client, /\/vibeify-updates/);
  assert.match(client, /Queue/);
  assert.match(client, /Steer/);
});

test("optional visual sources expose write-only credential entry and a local fallback", () => {
  assert.match(client, /\/dsh-visuals/);
  assert.match(client, /Better article images/);
  assert.match(client, /Wikimedia Commons · Openverse/);
  assert.match(client, /PEXELS_API_KEY/);
  assert.match(client, /PIXABAY_API_KEY/);
  assert.match(client, /credentials\.describe/);
  assert.match(client, /credentials\.set/);
  assert.match(client, /credentials\.unset/);
  assert.match(client, /Image credential operation failed/);
  assert.match(client, /Keys are write-only/);
  assert.match(client, /The DSH Visuals plugin is not active/);
});

test("reader cards expose direct public-link sharing without Social Desk or scheduling UI", () => {
  assert.match(client, /function PublicLinkShare/);
  assert.match(client, /Share link/);
  assert.match(client, /Public link/);
  assert.match(client, /Copy link/);
  assert.match(client, /navigator\.share/);
  assert.match(client, /Copy is unavailable\. Select the link below to copy it\./);
  assert.doesNotMatch(client, /Vibe Social Desk|dsh-social-desk|X_USER_ACCESS_TOKEN|BLUESKY_APP_PASSWORD/);
  assert.doesNotMatch(client, /Optional automatic posting|Approve and schedule|Schedule post/);
  assert.doesNotMatch(client, /setSocialOpen|vfx-social-desk|vfx-social-tab|vfx-social-prepare/);
});


test("magazine receives the injected RPC connection without a context property alias", () => {
  let descriptor;
  runInNewContext(client, { window: { __ModuleLoader__: { load(value) { descriptor = value; } } } });
  const react = { createElement: (type, props) => ({ type, props }) };
  const plugin = descriptor.factory(() => react);
  const connection = { api: { sessions: {} }, rpc: { call: async () => ({ ok: true }) } };
  const registrations = new Map();
  const ctx = {
    get: (name) => name === "connection" ? connection : {},
    effect: () => {},
    configForms: { get: () => ({}) },
    slots: {
      inject: (_name, register) => register(),
      register: (slot, render) => { registrations.set(slot.id, { slot, render }); },
    },
  };
  plugin.apply(ctx);
  const shell = [...registrations.values()].find(({ slot }) => slot.name === "shell.overlay");
  assert.ok(shell);
  assert.equal(shell.render().props.connection, connection);
});
