/**
 * Token estimation utilities
 *
 * Enkel heuristik baserad på tumregeln:
 *   ~1 token ≈ 4 tecken i snitt.
 * Detta är tillräckligt för budgetvarningar, inte exakt räkning.
 */

export function estimateTokensFromString(str: string): number {
  if (!str) return 0;
  const length = str.length;
  return Math.max(1, Math.round(length / 4));
}

export function estimatePromptTokens(
  systemPrompt: string,
  userPrompt: string,
): number {
  return (
    estimateTokensFromString(systemPrompt) +
    estimateTokensFromString(userPrompt)
  );
}

