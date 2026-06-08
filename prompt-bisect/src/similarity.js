"use strict";
// prompt-bisect: Similarity functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringSimilarity = stringSimilarity;
exports.levenshteinSimilarity = levenshteinSimilarity;
exports.combinedSimilarity = combinedSimilarity;
exports.structuredSimilarity = structuredSimilarity;
/**
 * String-based similarity using token overlap (Jaccard-like).
 * No external dependencies — works offline, fast.
 */
function stringSimilarity(a, b) {
    if (a === b)
        return 1;
    if (!a || !b)
        return 0;
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    if (tokensA.length === 0 && tokensB.length === 0)
        return 1;
    if (tokensA.length === 0 || tokensB.length === 0)
        return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    let intersection = 0;
    for (const t of setA) {
        if (setB.has(t))
            intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 1 : intersection / union;
}
/**
 * Normalized Levenshtein distance ratio.
 * More sensitive to small changes than token overlap.
 */
function levenshteinSimilarity(a, b) {
    if (a === b)
        return 1;
    if (!a || !b)
        return 0;
    const dist = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
}
/**
 * Combined similarity: average of token overlap and Levenshtein.
 * Good balance of semantic awareness and edit sensitivity.
 */
function combinedSimilarity(a, b) {
    return (stringSimilarity(a, b) + levenshteinSimilarity(a, b)) / 2;
}
/**
 * Compare structured outputs (JSON). Handles nested objects.
 * Returns field-level match ratio.
 */
function structuredSimilarity(a, b) {
    let parsedA;
    let parsedB;
    try {
        parsedA = JSON.parse(a);
    }
    catch {
        // Not valid JSON, fall back to string comparison
        return combinedSimilarity(a, b);
    }
    try {
        parsedB = JSON.parse(b);
    }
    catch {
        return combinedSimilarity(a, b);
    }
    const fieldsA = flattenObject(parsedA);
    const fieldsB = flattenObject(parsedB);
    if (fieldsA.length === 0 && fieldsB.length === 0)
        return 1;
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
        }
        else if (valA !== undefined && valB !== undefined) {
            // Partial credit for similar values
            matches += combinedSimilarity(String(valA), String(valB));
        }
    }
    return total === 0 ? 1 : matches / total;
}
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 0);
}
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return dp[m][n];
}
function flattenObject(obj, prefix = '') {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return [[prefix, String(obj)]];
    }
    if (Array.isArray(obj)) {
        const result = [];
        obj.forEach((item, i) => {
            result.push(...flattenObject(item, `${prefix}[${i}]`));
        });
        return result;
    }
    const result = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        result.push(...flattenObject(value, fullKey));
    }
    return result;
}
//# sourceMappingURL=similarity.js.map