import {
  QUESTIONNAIRE_MAX_INTRODUCTION,
  QUESTIONNAIRE_MAX_LABEL,
  QUESTIONNAIRE_MAX_OPTIONS,
  QUESTIONNAIRE_MIN_OPTIONS,
} from "../../questionnaire-contract.js";

const OPTION = /^\s*[-*]\s+(.+?)\s*$/;
const IMAGE = /!\[/;
const OPTION_MARKUP = /(?:https?:\/\/|!\[|\[[^\]]*\]\(|[*_`<>])/i;
const NUMBERED_EXERCISE = /^\s*\d+[.)]\s+/m;
const DIRECTED_ANSWER = /\b(?:pick|choose|select)\s+(?:the\s+)?(?:first|second|third|fourth|fifth|sixth|last)\s+(?:answer|option|choice)\b/i;

function visibleLabel(value) {
  return String(value ?? "")
    .replace(/\[([^\]\n]+)\]\(https:\/\/[^\s)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split only the final bullet group into answers; earlier Markdown remains article copy. */
export function questionnaireParts(markdown) {
  if (typeof markdown !== "string") return Object.freeze({ introduction: "", options: Object.freeze([]) });
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let cursor = lines.length - 1;
  while (cursor >= 0 && lines[cursor].trim() === "") cursor -= 1;
  const options = [];
  while (cursor >= 0) {
    const match = OPTION.exec(lines[cursor]);
    if (match === null) break;
    options.unshift(match[1].trim());
    cursor -= 1;
    while (cursor >= 0 && lines[cursor].trim() === "") cursor -= 1;
  }
  const introduction = lines.slice(0, cursor + 1).join("\n").trim();
  return Object.freeze({ introduction, options: Object.freeze(options) });
}

/** Generated questionnaires must be compact, explicit editorial controls. */
export function validQuestionnaireMarkdown(markdown) {
  const { introduction, options } = questionnaireParts(markdown);
  if (introduction.length === 0 || introduction.length > QUESTIONNAIRE_MAX_INTRODUCTION) return false;
  if (options.length < QUESTIONNAIRE_MIN_OPTIONS || options.length > QUESTIONNAIRE_MAX_OPTIONS) return false;
  if (IMAGE.test(introduction) || NUMBERED_EXERCISE.test(introduction) || DIRECTED_ANSWER.test(introduction)) return false;
  const visible = options.map(visibleLabel);
  if (visible.some((label, index) => label !== options[index] || label.length === 0 || label.length > QUESTIONNAIRE_MAX_LABEL || label.endsWith("?") || OPTION_MARKUP.test(label))) return false;
  return new Set(visible.map((label) => label.toLocaleLowerCase())).size === visible.length;
}
