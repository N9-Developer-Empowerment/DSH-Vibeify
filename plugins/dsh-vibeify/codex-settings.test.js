import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_SETTINGS_NAMESPACE,
  Config,
  installCodexRuntimeSettings,
} from "./codex-settings.js";
import { DEFAULT_CODEX_RUNTIME_SETTINGS } from "./codex-capability.js";

test("Codex settings install through the current DSH settings service", () => {
  let registered;
  const owner = {
    inject(services, callback) {
      assert.deepEqual(services, ["settings"]);
      callback({
        settings: {
          installSection(target, namespace, schema, entry, hooks) {
            registered = { target, namespace, schema, entry, hooks };
            hooks.setSource(() => schema(entry));
          },
        },
      });
    },
  };
  const getSettings = installCodexRuntimeSettings(owner, {});
  assert.equal(CODEX_SETTINGS_NAMESPACE, "llm-codex-chatgpt");
  assert.equal(registered.target, owner);
  assert.equal(registered.namespace, CODEX_SETTINGS_NAMESPACE);
  assert.equal(typeof registered.hooks.onChange, "function");
  assert.deepEqual(getSettings(), DEFAULT_CODEX_RUNTIME_SETTINGS);
});

test("the configured Codex model and effort remain schema-selectable", () => {
  assert.deepEqual(Config({}), DEFAULT_CODEX_RUNTIME_SETTINGS);
});

test("the plugin entry imports with the candidate DSH settings package", async () => {
  await import("./index.js");
});
