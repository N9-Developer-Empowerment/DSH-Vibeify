import assert from "node:assert/strict";
import test from "node:test";

import {
  isDshWebCommand,
  parseListenerPids,
  withoutProviderKeys,
} from "./dsh-restart.mjs";

test("restart worker recognises supported DSH web command shapes", () => {
  assert.equal(isDshWebCommand("node /opt/homebrew/bin/dsh web --no-open"), true);
  assert.equal(isDshWebCommand("/opt/homebrew/bin/dsh --profile web --port 3080"), true);
  assert.equal(isDshWebCommand("node unrelated-server.js --port 3080"), false);
});

test("listener output is de-duplicated and rejects non-pids", () => {
  assert.deepEqual(parseListenerPids("42\n42\n91\nnoise\n"), [42, 91]);
});

test("provider API keys never reach canary or replacement DSH", () => {
  const environment = withoutProviderKeys({
    KEEP_ME: "yes",
    OPENAI_API_KEY: "secret",
    OPENAI_API_KEY_PATH: "/secret",
  });
  assert.deepEqual(environment, { KEEP_ME: "yes" });
});
