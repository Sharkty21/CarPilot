/** Condenses the opening question into a one-line conversation summary. */
export function summarize(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 70) return trimmed;
  return `${trimmed.slice(0, 67)}…`;
}
