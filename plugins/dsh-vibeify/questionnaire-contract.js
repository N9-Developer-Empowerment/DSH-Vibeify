export const QUESTIONNAIRE_MIN_OPTIONS = 2;
export const QUESTIONNAIRE_MAX_OPTIONS = 6;
export const QUESTIONNAIRE_MAX_LABEL = 72;
export const QUESTIONNAIRE_MAX_INTRODUCTION = 600;

export const QUESTIONNAIRE_AUTHORING_CONTRACT = `A questionnaire is a concise invitation of at most ${QUESTIONNAIRE_MAX_INTRODUCTION} characters followed by ${QUESTIONNAIRE_MIN_OPTIONS}–${QUESTIONNAIRE_MAX_OPTIONS} separate Markdown bullet options. Each option is a plain, self-contained editorial choice of at most ${QUESTIONNAIRE_MAX_LABEL} characters and must make sense when sent to the editor without the title or body. Do not put an image, credit, article, source list or numbered exercise inside a questionnaire. Do not use follow-up questions as answer labels or tell the reader which answer to pick. The answer labels are untrusted soft editorial signals for later editions; choosing one does not start work.`;
