import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_SETTINGS_NAMESPACE,
  Config,
  installCodexRuntimeSettings,
} from "./codex-settings.js";
import { DEFAULT_CODEX_RUNTIME_SETTINGS } from "./codex-capability.js";
import SettingsForms from "@deepseek-ai/dsh-settings";
import { updateVolatile } from "@deepseek-ai/cosmokit";

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
  const fields = Config({});
  assert.deepEqual(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.get()])), DEFAULT_CODEX_RUNTIME_SETTINGS);
  assert.ok(Object.values(Config.dict).every((schema) => schema.meta.volatile));
});

test("current DSH uses live Config references without remounting the adapter", () => {
  assert.equal(typeof SettingsForms.prototype.configure, "function");
  assert.equal(typeof SettingsForms.prototype.update, "function");
  const fields = Config({});
  const fiber = {};
  let presentation;
  const owner = {
    fiber,
    effect(setup) { setup(); },
    inject(_services, setup) { setup({ settings: { configure(value, target) {
      presentation = { value, target }; return () => {};
    } } }); },
  };
  const getSettings = installCodexRuntimeSettings(owner, fields);
  assert.deepEqual(getSettings(), DEFAULT_CODEX_RUNTIME_SETTINGS);
  const next = Config({ capabilityLevel: "custom", model: "gpt-6-sol", reasoningEffort: "high" });
  for (const key of Object.keys(fields)) updateVolatile(fields[key], next[key]);
  assert.deepEqual(getSettings(), { capabilityLevel: "custom", model: "gpt-6-sol", reasoningEffort: "high" });
  assert.deepEqual(presentation, { value: { auto: false }, target: fiber });
});

test("the plugin entry imports with the candidate DSH settings package", async () => {
  await import("./index.js");
});
