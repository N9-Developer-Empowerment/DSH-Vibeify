import assert from "node:assert/strict";
import test from "node:test";

import {
  questionnaireParts,
  validQuestionnaireMarkdown,
} from "./client-src/experience/questionnaire.js";

test("only the final bullet group becomes questionnaire answer labels", () => {
  const parsed = questionnaireParts([
    "Try one small creative route.",
    "",
    "1. **Record:** Make a tiny film.",
    "2. **Write:** Capture one memory.",
    "",
    "- More tiny filmmaking projects",
    "- More constrained writing ideas",
  ].join("\n"));
  assert.match(parsed.introduction, /1\. \*\*Record:\*\*/);
  assert.deepEqual(parsed.options, ["More tiny filmmaking projects", "More constrained writing ideas"]);
});

test("generated questionnaire validation protects useful editorial signals", () => {
  assert.equal(validQuestionnaireMarkdown("Choose the next direction.\n\n- More tiny filmmaking projects\n- More constrained writing ideas"), true);
  assert.equal(validQuestionnaireMarkdown("Choose the next direction.\n\n- More film"), false);
  assert.equal(validQuestionnaireMarkdown(`Choose the next direction.\n\n${Array.from({ length: 7 }, (_value, index) => `- Direction ${index + 1}`).join("\n")}`), false);
  assert.equal(validQuestionnaireMarkdown(`Choose the next direction.\n\n- ${"A".repeat(73)}\n- More writing`), false);
  assert.equal(validQuestionnaireMarkdown(`${"A".repeat(601)}\n\n- More film\n- More writing`), false);
  assert.equal(validQuestionnaireMarkdown("Choose.\n\n- Same direction\n- Same direction"), false);
  assert.equal(validQuestionnaireMarkdown("Choose.\n\n- Which one should the editor choose?\n- Surprise me"), false);
  assert.equal(validQuestionnaireMarkdown("Choose.\n\n- **More film**\n- More writing"), false);
  assert.equal(validQuestionnaireMarkdown("Choose.\n\n- More at http://example.com\n- More writing"), false);
  assert.equal(validQuestionnaireMarkdown("Choose.\n\n1. Record a film\n2. Write a memory\n\n- More film\n- More writing"), false);
  assert.equal(validQuestionnaireMarkdown("![A studio](https://example.com/studio.jpg)\n\nChoose.\n\n- More film\n- More writing"), false);
  assert.equal(validQuestionnaireMarkdown("Pick the third answer.\n\n- More film\n- More writing"), false);
});
