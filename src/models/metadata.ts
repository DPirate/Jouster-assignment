/**
 * Sentiment type representing the emotional tone of analyzed text
 */
export type Sentiment = "positive" | "neutral" | "negative";

/**
 * Metadata extracted from analyzed text
 */
export interface Metadata {
  /** Extracted title or null if not found */
  title: string | null;

  /** Array of exactly 3 key topics */
  topics: string[];

  /** Overall sentiment classification */
  sentiment: Sentiment;

  /** Array of 0-3 most frequent nouns (custom extraction) */
  keywords: string[];
}
