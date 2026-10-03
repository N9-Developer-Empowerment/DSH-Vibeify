import test from "node:test";
import assert from "node:assert/strict";
import { Config, installVisualSettings, VISUAL_SETTINGS_NAMESPACE } from "./settings.js";

test("visual settings retain composition values until the settings service is available", () => {
  let connect;
  const ctx = { inject(names, callback) { assert.deepEqual(names, ["settings"]); connect = callback; } };
  const base = { wikimedia: true };
  const read = installVisualSettings(ctx, base);
  assert.equal(read(), base);
  let hooks;
  connect({ settings: { installSection(owner, namespace, schema, entry, callbacks) {
    assert.equal(owner, ctx);
    assert.equal(namespace, VISUAL_SETTINGS_NAMESPACE);
    assert.equal(entry, base);
    assert.ok(schema);
    hooks = callbacks;
  } } });
  const updated = { wikimedia: false };
  hooks.setSource(() => updated);
  assert.equal(read(), updated);
});


test("current DSH exposes editable visual fields and reads live Config references", () => {
  assert.ok(Object.values(Config.dict).every((field) => field.meta.volatile));
  const values = { wikimedia: true, openverse: true, pexelsApiKeyEnv: "PEXELS_API_KEY" };
  const entry = Object.fromEntries(Object.keys(values).map((key) => [key, { get: () => values[key] }]));
  const fiber = {};
  let presentation;
  let disposed = false;
  const ctx = {
    fiber,
    effect(setup) { const cleanup = setup(); assert.equal(typeof cleanup, "function"); cleanup(); },
    inject(names, setup) {
      assert.deepEqual(names, ["settings"]);
      setup({ settings: { configure(policy, owner) {
        presentation = { policy, owner };
        return () => { disposed = true; };
      } } });
    },
  };
  const read = installVisualSettings(ctx, entry);
  assert.deepEqual(read(), values);
  values.wikimedia = false;
  values.pexelsApiKeyEnv = "CUSTOM_PEXELS_KEY";
  assert.deepEqual(read(), values);
  assert.deepEqual(presentation, { policy: { auto: false }, owner: fiber });
  assert.equal(disposed, true);
});
