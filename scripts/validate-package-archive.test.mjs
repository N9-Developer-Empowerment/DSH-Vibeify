import assert from "node:assert/strict";
import test from "node:test";

import {
  missingRelativeModules,
  relativeModuleSpecifiers,
} from "./validate-package-archive.mjs";

test("static, re-exported and dynamic relative modules are discovered", () => {
  const source = `
    import { one } from "./one.js";
    export { two } from './two.js';
    const three = import("./three.js");
    import external from "external-package";
  `;
  assert.deepEqual(relativeModuleSpecifiers(source).sort(), ["./one.js", "./three.js", "./two.js"]);
});

test("complete relative module closure passes", () => {
  const files = new Map([
    ["index.js", 'import "./progressive-output.js"; export * from "./nested/tool";'],
    ["progressive-output.js", "export const ready = true;"],
    ["nested/tool.js", "export const tool = true;"],
  ]);
  assert.deepEqual(missingRelativeModules(files), []);
});

test("a missing or escaping relative import fails closed", () => {
  const files = new Map([
    ["index.js", 'import "./missing.js"; import "../outside.js";'],
  ]);
  assert.deepEqual(missingRelativeModules(files), [
    { filename: "index.js", specifier: "./missing.js" },
    { filename: "index.js", specifier: "../outside.js" },
  ]);
});
