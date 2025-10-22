import { logger } from "../utils/logger.ts";

/**
 * Common English stopwords to filter out
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
  "to", "was", "will", "with", "this", "but", "they", "have", "had",
  "what", "when", "where", "who", "which", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "or",
]);

/**
 * Simple noun identification patterns
 * This is a basic implementation - in production, use a proper NLP library
 */
function isLikelyNoun(word: string): boolean {
  // Capitalize check (proper nouns)
  if (word[0] === word[0].toUpperCase() && word.length > 1) {
    return true;
  }

  // Common noun endings
  const nounEndings = ["tion", "ness", "ment", "ance", "ence", "ship", "ty", "ity"];
  return nounEndings.some((ending) => word.toLowerCase().endsWith(ending));
}

/**
 * Extract up to 3 most frequent nouns from text (FR-005)
 * Returns 0-3 items depending on noun availability
 */
export function extractKeywords(text: string): string[] {
  logger.debug("Extracting keywords from text", { textLength: text.length });

  // Tokenize: split by whitespace and punctuation
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2); // Min length 3

  // Filter stopwords
  const contentWords = words.filter((word) => !STOPWORDS.has(word));

  // Try to identify nouns (basic heuristic)
  // In production, use a proper POS tagger like compromise or natural
  const originalWords = text.split(/\s+/);
  const nouns: string[] = [];

  for (const originalWord of originalWords) {
    const cleaned = originalWord.replace(/[^\w]/g, "").toLowerCase();
    if (
      cleaned.length > 2 &&
      !STOPWORDS.has(cleaned) &&
      isLikelyNoun(originalWord.replace(/[^\w]/g, ""))
    ) {
      nouns.push(cleaned);
    }
  }

  // If heuristic found no nouns, fall back to all content words
  const wordsToCount = nouns.length > 0 ? nouns : contentWords;

  // Count frequency
  const frequency = new Map<string, number>();
  for (const word of wordsToCount) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // Sort by frequency (descending) and take top 3
  const sorted = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  logger.info("Keywords extracted", {
    count: sorted.length,
    keywords: sorted,
  });

  return sorted;
}
