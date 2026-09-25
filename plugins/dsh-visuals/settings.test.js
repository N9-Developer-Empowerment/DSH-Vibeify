import test from "node:test";
import assert from "node:assert/strict";
import { installVisualSettings, VISUAL_SETTINGS_NAMESPACE } from "./settings.js";

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
