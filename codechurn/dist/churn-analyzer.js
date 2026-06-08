"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurnAnalyzer = void 0;
const git_analyzer_1 = require("./git-analyzer");
class ChurnAnalyzer {
    constructor(repoPath = '.') {
        this.git = new git_analyzer_1.GitAnalyzer(repoPath);
    }
    /**
     * Run full churn analysis
     */
    analyze(options = {}) {
        const config = options.config || this.getDefaultConfig();
        const commits = this.git.getCommitLog(options.since, options.until, options.author, config.aiDetection);
        const aiCommits = commits.filter(c => c.isAI);
        const humanCommits = commits.filter(c => !c.isAI);
        // Build per-file stats
        const fileStats = this.buildFileStats(commits, options.files);
        // Sort by AI churn (hottest files first)
        const sortedFiles = fileStats.sort((a, b) => {
            const scoreA = this.calculateHotspotScore(a, config);
            const scoreB = this.calculateHotspotScore(b, config);
            return scoreB - scoreA;
        });
        const limitedFiles = options.top ? sortedFiles.slice(0, options.top) : sortedFiles;
        // Calculate summary
        const totalLines = limitedFiles.reduce((s, f) => s + f.totalLines, 0);
        const aiLines = limitedFiles.reduce((s, f) => s + f.aiLines, 0);
        const humanLines = limitedFiles.reduce((s, f) => s + f.humanLines, 0);
        const avgAiChurn = this.weightedAverage(limitedFiles.map(f => ({
            value: f.aiChurnRate,
            weight: f.aiLines,
        })));
        const avgHumanChurn = this.weightedAverage(limitedFiles.map(f => ({
            value: f.humanChurnRate,
            weight: f.humanLines,
        })));
        const avgAiSurvival = this.weightedAverage(limitedFiles.map(f => ({
            value: f.aiSurvivalRate,
            weight: f.aiLines,
        })));
        const avgHumanSurvival = this.weightedAverage(limitedFiles.map(f => ({
            value: f.humanSurvivalRate,
            weight: f.humanLines,
        })));
        // Revert rate: commits that contain "revert" in message
        const aiReverts = aiCommits.filter(c => /revert|undo|rollback|roll back/i.test(c.message)).length;
        const humanReverts = humanCommits.filter(c => /revert|undo|rollback|roll back/i.test(c.message)).length;
        // Average lifetime (days between line introduction and last change)
        const aiLifetime = this.calcAvgLifetime(limitedFiles, true);
        const humanLifetime = this.calcAvgLifetime(limitedFiles, false);
        // Hotspots: files where AI churn rate > 50% and at least 10 AI lines
        const hotspots = limitedFiles
            .filter(f => f.aiChurnRate > 0.5 && f.aiLines >= 10)
            .map(f => f.file);
        // Model breakdown
        const modelBreakdown = this.buildModelBreakdown(commits);
        return {
            repo: this.git.getRepoName(),
            branch: this.git.getBranch(),
            since: options.since || 'beginning',
            until: options.until || 'now',
            totalCommits: commits.length,
            aiCommits: aiCommits.length,
            humanCommits: humanCommits.length,
            files: limitedFiles,
            summary: {
                totalLines,
                aiLines,
                humanLines,
                aiChurnRate: avgAiChurn,
                humanChurnRate: avgHumanChurn,
                aiSurvivalRate: avgAiSurvival,
                humanSurvivalRate: avgHumanSurvival,
                revertRate: {
                    ai: aiCommits.length > 0 ? aiReverts / aiCommits.length : 0,
                    human: humanCommits.length > 0 ? humanReverts / humanCommits.length : 0,
                },
                avgLifetime: { ai: aiLifetime, human: humanLifetime },
                hotspots,
            },
            modelBreakdown,
        };
    }
    /**
     * Calculate hotspot score for ranking files
     */
    calculateHotspotScore(file, config) {
        const churnWeight = config.weights?.churn || 0.4;
        const survivalWeight = config.weights?.survival || 0.3;
        const volumeWeight = config.weights?.volume || 0.3;
        const churnScore = file.aiChurnRate;
        const survivalScore = 1 - file.aiSurvivalRate; // lower survival = higher score
        const volumeScore = Math.min(file.aiLines / config.minLines || 100, 1);
        return churnScore * churnWeight + survivalScore * survivalWeight + volumeScore * volumeWeight;
    }
    /**
     * Build per-file statistics from commit history
     */
    buildFileStats(commits, targetFiles, config) {
        const finalConfig = config || this.getDefaultConfig();
        // Collect all files touched and track line changes
        const fileMap = new Map();
        for (const commit of commits) {
            const diffStats = this.git.getCommitDiffStats(commit.hash);
            for (const [file, stats] of Object.entries(diffStats.files)) {
                // Skip binary/non-code files
                if (this.shouldSkip(file, finalConfig))
                    continue;
                if (targetFiles && !targetFiles.includes(file))
                    continue;
                if (!fileMap.has(file)) {
                    fileMap.set(file, {
                        aiAdded: 0, humanAdded: 0,
                        aiRemoved: 0, humanRemoved: 0,
                        revisions: [],
                        commitHashes: new Set(),
                    });
                }
                const entry = fileMap.get(file);
                if (entry.commitHashes.has(commit.hash))
                    continue;
                entry.commitHashes.add(commit.hash);
                if (commit.isAI) {
                    entry.aiAdded += stats.added;
                    entry.aiRemoved += stats.removed;
                }
                else {
                    entry.humanAdded += stats.added;
                    entry.humanRemoved += stats.removed;
                }
                entry.revisions.push({
                    hash: commit.hash,
                    author: commit.author,
                    date: commit.date,
                    message: commit.message,
                    isAI: commit.isAI,
                    linesAdded: stats.added,
                    linesRemoved: stats.removed,
                });
            }
        }
        // Convert to FileChurnStats
        const results = [];
        for (const [file, data] of fileMap) {
            const totalAiTouched = data.aiAdded + data.aiRemoved;
            const totalHumanTouched = data.humanAdded + data.humanRemoved;
            const totalTouches = totalAiTouched + totalHumanTouched;
            const aiLines = data.aiAdded;
            const humanLines = data.humanAdded;
            const totalLines = aiLines + humanLines;
            // Churn = lines removed / lines added (higher = more rewriting)
            const aiChurnRate = data.aiAdded > 0 ? data.aiRemoved / data.aiAdded : 0;
            const humanChurnRate = data.humanAdded > 0 ? data.humanRemoved / data.humanAdded : 0;
            // Survival = lines still present / lines ever added
            const aiSurvivalRate = data.aiAdded > 0
                ? Math.max(0, (data.aiAdded - data.aiRemoved) / data.aiAdded)
                : 0;
            const humanSurvivalRate = data.humanAdded > 0
                ? Math.max(0, (data.humanAdded - data.humanRemoved) / data.humanAdded)
                : 0;
            const hotspotScore = this.calculateHotspotScore({
                file,
                totalLines,
                aiLines,
                humanLines,
                aiLinesSurvived: Math.max(0, data.aiAdded - data.aiRemoved),
                humanLinesSurvived: Math.max(0, data.humanAdded - data.humanRemoved),
                aiChurnRate: Math.min(aiChurnRate, 1),
                humanChurnRate: Math.min(humanChurnRate, 1),
                aiSurvivalRate,
                humanSurvivalRate,
                revisions: data.revisions,
            }, finalConfig);
            results.push({
                file,
                totalLines,
                aiLines,
                humanLines,
                aiLinesSurvived: Math.max(0, data.aiAdded - data.aiRemoved),
                humanLinesSurvived: Math.max(0, data.humanAdded - data.humanRemoved),
                aiChurnRate: Math.min(aiChurnRate, 1),
                humanChurnRate: Math.min(humanChurnRate, 1),
                aiSurvivalRate,
                humanSurvivalRate,
                revisions: data.revisions,
                hotspotScore,
            });
        }
        return results;
    }
    /**
     * Skip binary/non-code files based on configuration
     */
    shouldSkip(file, config) {
        const skipPatterns = config.skipPatterns || [
            /\.lock$/, /package-lock\.json/, /yarn\.lock/, /pnpm-lock\.yaml/,
            /\.min\./, /\.map$/, /\.snap$/, /node_modules\//,
            /\.git\//, /dist\//, /build\//, /\.next\//,
            /package\.json$/, /tsconfig\.json$/, /\.eslintrc/,
        ];
        return skipPatterns.some(p => p.test(file));
    }
    weightedAverage(items) {
        const totalWeight = items.reduce((s, i) => s + i.weight, 0);
        if (totalWeight === 0)
            return 0;
        const weightedSum = items.reduce((s, i) => s + i.value * i.weight, 0);
        return weightedSum / totalWeight;
    }
    calcAvgLifetime(files, ai) {
        const lifetimes = [];
        for (const file of files) {
            const revs = file.revisions.filter(r => r.isAI === ai);
            if (revs.length < 2)
                continue;
            const sorted = revs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const first = new Date(sorted[0].date).getTime();
            const last = new Date(sorted[sorted.length - 1].date).getTime();
            lifetimes.push((last - first) / (1000 * 60 * 60 * 24));
        }
        if (lifetimes.length === 0)
            return 0;
        return Math.round(lifetimes.reduce((s, l) => s + l, 0) / lifetimes.length);
    }
    buildModelBreakdown(commits) {
        const aiCommits = commits.filter(c => c.isAI && c.aiModel);
        if (aiCommits.length === 0)
            return undefined;
        const modelMap = new Map();
        for (const commit of aiCommits) {
            const model = commit.aiModel;
            if (!modelMap.has(model)) {
                modelMap.set(model, { commits: 0, added: 0, removed: 0 });
            }
            const entry = modelMap.get(model);
            entry.commits++;
            const diffStats = this.git.getCommitDiffStats(commit.hash);
            for (const stats of Object.values(diffStats.files)) {
                entry.added += stats.added;
                entry.removed += stats.removed;
            }
        }
        const result = {};
        for (const [model, data] of modelMap) {
            result[model] = {
                commits: data.commits,
                lines: data.added,
                churnRate: data.added > 0 ? Math.min(data.removed / data.added, 1) : 0,
                survivalRate: data.added > 0 ? Math.max(0, (data.added - data.removed) / data.added) : 0,
            };
        }
        return result;
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            aiDetection: {
                patterns: [
                    /ai|artificial intelligence|gpt|claude|chatbot|llm/mi,
                    /generated by ai|ai generated|machine written/mi,
                    /copilot|github copilot|cursor|codex/mi,
                ],
                minCommits: 5,
            },
            minLines: 50,
            weights: {
                churn: 0.4,
                survival: 0.3,
                volume: 0.3,
            },
            skipPatterns: [
                /\.lock$/, /package-lock\.json/, /yarn\.lock/, /pnpm-lock\.yaml/,
                /\.min\./, /\.map$/, /\.snap$/, /node_modules\//,
                /\.git\//, /dist\//, /build\//, /\.next\//,
                /package\.json$/, /tsconfig\.json$/, /\.eslintrc/,
            ],
            reportFormat: 'detailed',
            thresholds: {
                highChurn: 0.5,
                lowSurvival: 0.7,
                minHotspotLines: 50,
            },
        };
    }
}
exports.ChurnAnalyzer = ChurnAnalyzer;
//# sourceMappingURL=churn-analyzer.js.map