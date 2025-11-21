// LLM-prompter hämtas från externa markdown-filer så att innehållet kan
// uppdateras utan att ändra logik. Vite hanterar `?raw`‑importer vid build.
import featureEpicPromptMd from '../../prompts/llm/feature_epic_prompt.md?raw';
import dmnBusinessRulePromptMd from '../../prompts/llm/dmn_businessrule_prompt.md?raw';
import testscriptPromptMd from '../../prompts/llm/testscript_prompt.md?raw';

export const FEATURE_EPIC_PROMPT = featureEpicPromptMd;
export const DMN_BUSINESSRULE_PROMPT = dmnBusinessRulePromptMd;
export const TESTSCRIPT_PROMPT = testscriptPromptMd;
