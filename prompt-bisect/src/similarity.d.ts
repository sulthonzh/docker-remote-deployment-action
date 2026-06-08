/**
 * String-based similarity using token overlap (Jaccard-like).
 * No external dependencies — works offline, fast.
 */
export declare function stringSimilarity(a: string, b: string): number;
/**
 * Normalized Levenshtein distance ratio.
 * More sensitive to small changes than token overlap.
 */
export declare function levenshteinSimilarity(a: string, b: string): number;
/**
 * Combined similarity: average of token overlap and Levenshtein.
 * Good balance of semantic awareness and edit sensitivity.
 */
export declare function combinedSimilarity(a: string, b: string): number;
/**
 * Compare structured outputs (JSON). Handles nested objects.
 * Returns field-level match ratio.
 */
export declare function structuredSimilarity(a: string, b: string): number;
//# sourceMappingURL=similarity.d.ts.map