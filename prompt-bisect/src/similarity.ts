// prompt-bisect: Similarity functions

/**
 * String-based similarity using token overlap (Jaccard-like).
 * No external dependencies — works offline, fast.
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Normalized Levenshtein distance ratio.
 * More sensitive to small changes than token overlap.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Combined similarity: average of token overlap and Levenshtein.
 * Good balance of semantic awareness and edit sensitivity.
 */
export function combinedSimilarity(a: string, b: string): number {
  return (stringSimilarity(a, b) + levenshteinSimilarity(a, b)) / 2;
}

/**
 * Compare structured outputs (JSON). Handles nested objects.
 * Returns field-level match ratio.
 */
export function structuredSimilarity(a: string, b: string): number {
  let parsedA: unknown;
  let parsedB: unknown;

  try {
    parsedA = JSON.parse(a);
  } catch {
    // Not valid JSON, fall back to string comparison
    return combinedSimilarity(a, b);
  }

  try {
    parsedB = JSON.parse(b);
  } catch {
    return combinedSimilarity(a, b);
  }

  const fieldsA = flattenObject(parsedA);
  const fieldsB = flattenObject(parsedB);

  if (fieldsA.length === 0 && fieldsB.length === 0) return 1;

  const keysA = new Set(fieldsA.map(f => f[0]));
  const keysB = new Set(fieldsB.map(f => f[0]));
  const allKeys = new Set([...keysA, ...keysB]);

  let matches = 0;
  let total = 0;

  for (const key of allKeys) {
    total++;
    const valA = fieldsA.find(f => f[0] === key)?.[1];
    const valB = fieldsB.find(f => f[0] === key)?.[1];
    if (valA === valB) {
      matches++;
    } else if (valA !== undefined && valB !== undefined) {
      // Partial credit for similar values
      matches += combinedSimilarity(String(valA), String(valB));
    }
  }

  return total === 0 ? 1 : matches / total;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

function flattenObject(obj: unknown, prefix = ''): [string, string][] {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return [[prefix, String(obj)]];
  }

  if (Array.isArray(obj)) {
    const result: [string, string][] = [];
    obj.forEach((item, i) => {
      result.push(...flattenObject(item, `${prefix}[${i}]`));
    });
    return result;
  }

  const result: [string, string][] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    result.push(...flattenObject(value, fullKey));
  }
  return result;
}
