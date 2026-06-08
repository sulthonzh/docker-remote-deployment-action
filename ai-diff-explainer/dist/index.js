#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var OpenAI = require('openai');
var diff = require('diff');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var OpenAI__default = /*#__PURE__*/_interopDefault(OpenAI);

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var OpenAIProvider = class {
  client;
  constructor(apiKey) {
    this.client = new OpenAI__default.default({
      apiKey
    });
  }
  async analyze(diff, context) {
    const prompt = `
Analyze the following git diff and provide a comprehensive explanation. The context is: ${context}

Diff:
${diff}

Please provide:
1. Overall summary of what changed
2. File-by-file analysis of the changes
3. Reasoning for why these changes were made
4. Impact assessment for performance, security, and maintainability
5. Any patterns detected in the changes

Format the response as structured JSON with the following structure:
{
  "summary": "Brief overview",
  "fileChanges": [
    {
      "filePath": "path/to/file",
      "changes": ["description of change 1", "description of change 2"],
      "reasoning": "Why these changes were made",
      "impact": {
        "performance": {"score": 8, "description": "...", "concerns": []},
        "security": {"score": 7, "description": "...", "concerns": []},
        "maintainability": {"score": 9, "description": "...", "concerns": []},
        "breaking": false,
        "risks": [],
        "opportunities": []
      },
      "complexity": {
        "cyclomatic": 2,
        "cognitive": 1,
        "maintainability": 8,
        "lines": {"added": 10, "removed": 5, "net": 5}
      }
    }
  ],
  "overallImpact": {
    "performance": {"score": 7, "description": "...", "concerns": []},
    "security": {"score": 8, "description": "...", "concerns": []},
    "maintainability": {"score": 9, "description": "...", "concerns": []},
    "breaking": false,
    "risks": [],
    "opportunities": []
  },
  "patterns": [
    {
      "type": "refactor",
      "confidence": 0.9,
      "description": "Code was refactored for better organization",
      "examples": []
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert code analyst who explains changes in git diffs with detailed reasoning and impact assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2e3
      });
      return response.choices[0]?.message?.content || "{}";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async explainPattern(pattern, examples) {
    const prompt = `
Explain the following code pattern and provide best practices:

Pattern: ${pattern}

Examples:
${examples.join("\n")}

Provide:
1. Clear explanation of what the pattern does
2. When to use this pattern
3. When not to use this pattern
4. Potential issues and considerations
5. Alternative approaches if applicable`;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an experienced software architect who explains code patterns and best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1e3
      });
      return response.choices[0]?.message?.content || "Unable to explain pattern.";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(`AI pattern explanation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async assessImpact(changes, context) {
    const changesText = changes.join("\n\n");
    const prompt = `
Assess the impact of the following code changes in the context of: ${context}

Changes:
${changesText}

Please provide an impact assessment with:
1. Performance impact (0-10 score with explanation)
2. Security impact (0-10 score with explanation) 
3. Maintainability impact (0-10 score with explanation)
4. Whether this introduces breaking changes
5. Potential risks
6. Opportunities for improvement

Format as JSON:
{
  "performance": {"score": 8, "description": "Performance will improve due to...", "concerns": []},
  "security": {"score": 7, "description": "Security is improved by...", "concerns": []},
  "maintainability": {"score": 9, "description": "Maintainability is enhanced by...", "concerns": []},
  "breaking": false,
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"]
}`;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a senior software engineer specializing in code impact assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1e3
      });
      const content = response.choices[0]?.message?.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(`AI impact assessment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
};
var DiffParser = class {
  parse(diffText) {
    const files = [];
    try {
      const patches = diff.parsePatch(diffText);
      for (const patch of patches) {
        if (!patch.oldFileName || !patch.newFileName) {
          continue;
        }
        const status = this.getStatus(patch.oldFileName, patch.newFileName);
        const changes = this.calculateChanges(patch);
        files.push({
          path: this.normalizePath(patch.newFileName),
          oldPath: this.normalizePath(patch.oldFileName),
          status,
          diff: this.formatPatch(patch),
          changes
        });
      }
    } catch (error) {
      throw new Error(`Failed to parse diff: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return files;
  }
  getStatus(oldFileName, newFileName) {
    if (oldFileName === "/dev/null" && newFileName !== "/dev/null") {
      return "added";
    } else if (oldFileName !== "/dev/null" && newFileName === "/dev/null") {
      return "removed";
    } else if (oldFileName !== newFileName) {
      return "renamed";
    } else {
      return "modified";
    }
  }
  calculateChanges(patch) {
    let added = 0;
    let removed = 0;
    let modified = 0;
    for (const hunk of patch.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith("+") && !line.startsWith("++")) {
          added++;
        } else if (line.startsWith("-") && !line.startsWith("--")) {
          removed++;
        } else if (line.startsWith("@@")) {
          modified++;
        }
      }
    }
    return { added, removed, modified };
  }
  formatPatch(patch) {
    const lines = [];
    lines.push(`--- ${patch.oldFileName}`);
    lines.push(`+++ ${patch.newFileName}`);
    lines.push("");
    for (const hunk of patch.hunks) {
      lines.push(`@@ ${hunk.oldStart},${hunk.oldCount} ${hunk.newStart},${hunk.newCount} @@`);
      for (const line of hunk.lines) {
        lines.push(line);
      }
    }
    return lines.join("\n");
  }
  normalizePath(path) {
    if (path === "/dev/null") {
      return "/dev/null";
    }
    return path.replace(/^([ab])\//, "");
  }
  generateSampleDiff() {
    const oldCode = `function getUser(id: number): Promise<User> {
  const user = await userService.getUser(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

interface User {
  id: number;
  name: string;
  email: string;
}`;
    const newCode = `async function getUser(id: number): Promise<User | null> {
  try {
    const user = await userService.getUser(id);
    return user || null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}`;
    return diff.createTwoFilesPatch(
      "user.service.ts",
      "user.service.ts",
      oldCode,
      newCode,
      "old",
      "new"
    );
  }
};

// src/analysis/analyzer.ts
var CodeAnalyzer = class {
  aiProvider;
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
  }
  async analyze(files, context) {
    const diffText = this.formatDiffForAnalysis(files);
    try {
      const aiResponse = await this.aiProvider.analyze(diffText, context);
      const analysis = this.parseAIResponse(aiResponse);
      const enhancedAnalysis = this.enhanceAnalysis(analysis, files);
      return enhancedAnalysis;
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  formatDiffForAnalysis(files) {
    let result = "";
    for (const file of files) {
      result += `File: ${file.path}
`;
      result += `Status: ${file.status}
`;
      result += `Changes: ${file.changes.added} added, ${file.changes.removed} removed
`;
      result += `---
`;
      result += `${file.diff}
`;
      result += `
${"=".repeat(50)}

`;
    }
    return result;
  }
  parseAIResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch (error) {
      return this.extractStructuredInfo(response);
    }
  }
  extractStructuredInfo(response) {
    const summaryMatch = response.match(/(?:summary|overview):\s*(.+)/i);
    const fileMatches = response.match(/(?:file|files?):\s*(.+)/gi);
    return {
      summary: summaryMatch ? summaryMatch[1] : "Analysis completed",
      fileChanges: fileMatches ? fileMatches.map((f) => ({
        filePath: f.replace(/(?:file|files?):\s*/i, ""),
        changes: ["See analysis for details"],
        reasoning: "Automatically generated",
        impact: {
          performance: { score: 7, description: "Standard assessment", concerns: [] },
          security: { score: 7, description: "Standard assessment", concerns: [] },
          maintainability: { score: 7, description: "Standard assessment", concerns: [] },
          breaking: false,
          risks: [],
          opportunities: []
        },
        complexity: {
          cyclomatic: 1,
          cognitive: 1,
          maintainability: 7,
          lines: { added: 0, removed: 0, net: 0 }
        }
      })) : [],
      overallImpact: {
        performance: { score: 7, description: "Standard assessment", concerns: [] },
        security: { score: 7, description: "Standard assessment", concerns: [] },
        maintainability: { score: 7, description: "Standard assessment", concerns: [] },
        breaking: false,
        risks: [],
        opportunities: []
      },
      patterns: [],
      recommendations: ["Review changes carefully", "Test thoroughly before deployment"]
    };
  }
  enhanceAnalysis(analysis, files) {
    const enhancedFiles = analysis.fileChanges.map((file, index) => {
      const actualFile = files[index];
      return {
        ...file,
        filePath: actualFile.path,
        changes: this.generateChangeDescriptions(actualFile),
        complexity: this.calculateComplexity(actualFile),
        impact: this.calculateImpact(actualFile),
        patterns: this.detectPatterns(actualFile)
      };
    });
    return {
      ...analysis,
      fileChanges: enhancedFiles,
      overallImpact: this.calculateOverallImpact(enhancedFiles),
      patterns: this.detectGlobalPatterns(enhancedFiles),
      metrics: this.generateMetrics(files, enhancedFiles)
    };
  }
  generateChangeDescriptions(file) {
    const descriptions = [];
    if (file.changes.added > 0) {
      descriptions.push(`Added ${file.changes.added} lines of code`);
    }
    if (file.changes.removed > 0) {
      descriptions.push(`Removed ${file.changes.removed} lines of code`);
    }
    if (file.changes.modified > 0) {
      descriptions.push(`Modified ${file.changes.modified} sections`);
    }
    if (file.status === "added") {
      descriptions.push("New file created");
    } else if (file.status === "removed") {
      descriptions.push("File deleted");
    } else if (file.status === "renamed") {
      descriptions.push("File renamed");
    }
    return descriptions;
  }
  calculateComplexity(file) {
    const cyclomatic = Math.min(10, Math.floor(file.changes.added / 10));
    const cognitive = Math.min(5, Math.floor(file.changes.added / 20));
    const maintainability = Math.max(1, 10 - Math.floor(file.changes.added / 50));
    return {
      cyclomatic,
      cognitive,
      maintainability,
      lines: {
        added: file.changes.added,
        removed: file.changes.removed,
        net: file.changes.added - file.changes.removed
      }
    };
  }
  calculateImpact(file) {
    let performance = 7;
    let security = 7;
    let maintainability = 7;
    const risks = [];
    const opportunities = [];
    if (file.changes.added > 100) {
      performance = Math.max(1, performance - 1);
      maintainability = Math.max(1, maintainability - 1);
      opportunities.push("Large changes should be carefully tested");
    }
    if (file.changes.removed > 50) {
      opportunities.push("Code cleanup improves maintainability");
    }
    if (file.status === "removed") {
      security = 8;
      opportunities.push("Removal simplifies codebase");
    }
    return {
      performance: {
        score: performance,
        description: this.getImpactDescription(performance, "performance"),
        concerns: performance < 7 ? ["Large code changes may impact performance"] : []
      },
      security: {
        score: security,
        description: this.getImpactDescription(security, "security"),
        concerns: security < 7 ? ["Changes may introduce security risks"] : []
      },
      maintainability: {
        score: maintainability,
        description: this.getImpactDescription(maintainability, "maintainability"),
        concerns: maintainability < 7 ? ["Code may be harder to maintain"] : []
      },
      breaking: file.changes.removed > file.changes.added * 2,
      risks,
      opportunities
    };
  }
  getImpactDescription(score, type) {
    if (score >= 9) return `Excellent ${type} impact`;
    if (score >= 7) return `Good ${type} impact`;
    if (score >= 5) return `Moderate ${type} impact`;
    if (score >= 3) return `Poor ${type} impact`;
    return `Very poor ${type} impact`;
  }
  detectPatterns(file) {
    const patterns = [];
    if (file.changes.added > file.changes.removed * 2) {
      patterns.push({
        type: "expansion",
        confidence: 0.8,
        description: "Code appears to be expanding or adding functionality",
        examples: []
      });
    }
    if (file.changes.removed > file.changes.added * 1.5) {
      patterns.push({
        type: "cleanup",
        confidence: 0.8,
        description: "Code appears to be cleaned up or simplified",
        examples: []
      });
    }
    if (file.changes.modified > 10) {
      patterns.push({
        type: "refactor",
        confidence: 0.6,
        description: "Multiple modifications suggest refactoring",
        examples: []
      });
    }
    return patterns;
  }
  calculateOverallImpact(files) {
    const totalFiles = files.length;
    let totalPerformance = 0;
    let totalSecurity = 0;
    let totalMaintainability = 0;
    let hasBreakingChanges = false;
    const allRisks = [];
    const allOpportunities = [];
    for (const file of files) {
      totalPerformance += file.impact.performance.score;
      totalSecurity += file.impact.security.score;
      totalMaintainability += file.impact.maintainability.score;
      if (file.impact.breaking) {
        hasBreakingChanges = true;
      }
      allRisks.push(...file.impact.risks);
      allOpportunities.push(...file.impact.opportunities);
    }
    return {
      performance: {
        score: Math.round(totalPerformance / totalFiles),
        description: this.getImpactDescription(Math.round(totalPerformance / totalFiles), "performance"),
        concerns: []
      },
      security: {
        score: Math.round(totalSecurity / totalFiles),
        description: this.getImpactDescription(Math.round(totalSecurity / totalFiles), "security"),
        concerns: []
      },
      maintainability: {
        score: Math.round(totalMaintainability / totalFiles),
        description: this.getImpactDescription(Math.round(totalMaintainability / totalFiles), "maintainability"),
        concerns: []
      },
      breaking: hasBreakingChanges,
      risks: [...new Set(allRisks)],
      opportunities: [...new Set(allOpportunities)]
    };
  }
  detectGlobalPatterns(files) {
    const patterns = [];
    const totalAdded = files.reduce((sum, file) => sum + file.complexity.lines.added, 0);
    const totalRemoved = files.reduce((sum, file) => sum + file.complexity.lines.removed, 0);
    if (totalAdded > 500) {
      patterns.push({
        type: "major-feature",
        confidence: 0.9,
        description: "Large scale changes suggest a major feature addition",
        examples: []
      });
    }
    if (totalRemoved > 200) {
      patterns.push({
        type: "cleanup-campaign",
        confidence: 0.8,
        description: "Significant code removal suggests cleanup initiative",
        examples: []
      });
    }
    if (files.length > 10) {
      patterns.push({
        type: "multi-file-refactor",
        confidence: 0.7,
        description: "Changes span many files suggesting broad refactoring",
        examples: []
      });
    }
    return patterns;
  }
  generateMetrics(files, analysis) {
    const totalAdded = files.reduce((sum, file) => sum + file.changes.added, 0);
    const totalRemoved = files.reduce((sum, file) => sum + file.changes.removed, 0);
    const estimatedHours = Math.max(1, Math.floor((totalAdded + totalRemoved) / 100));
    const riskLevel = totalAdded > 1e3 ? "high" : totalAdded > 500 ? "medium" : "low";
    return {
      totalFiles: files.length,
      totalLinesAdded: totalAdded,
      totalLinesRemoved: totalRemoved,
      estimatedHours,
      riskLevel
    };
  }
};

// src/generators/pr-generator.ts
var PRGenerator = class {
  generate(analysis) {
    const title = this.generateTitle(analysis);
    const summary = this.generateSummary(analysis);
    const technicalDetails = this.generateTechnicalDetails(analysis);
    const reviewNotes = this.generateReviewNotes(analysis);
    const breakingChanges = this.generateBreakingChanges(analysis);
    const testingNotes = this.generateTestingNotes(analysis);
    return {
      title,
      summary,
      technicalDetails,
      reviewNotes,
      breakingChanges,
      testingNotes
    };
  }
  generateTitle(analysis) {
    const patterns = analysis.patterns.map((p) => p.type).join(", ");
    const impact = analysis.overallImpact.breaking ? "Breaking Changes" : "Improvements";
    if (analysis.fileChanges.length === 1) {
      const file = analysis.fileChanges[0];
      return `${this.getChangeType(file.changes)} ${file.filePath}`;
    }
    return `${impact} across ${analysis.fileChanges.length} files (${patterns})`;
  }
  getChangeType(changes) {
    if (changes.some((c) => c.includes("refactor"))) return "Refactor";
    if (changes.some((c) => c.includes("add") && c.includes("feature"))) return "Feature";
    if (changes.some((c) => c.includes("fix") || c.includes("bug"))) return "Bug Fix";
    if (changes.some((c) => c.includes("performance") || c.includes("optimization"))) return "Performance";
    if (changes.some((c) => c.includes("security"))) return "Security";
    return "Update";
  }
  generateSummary(analysis) {
    const totalFiles = analysis.fileChanges.length;
    const totalLines = analysis.metrics.totalLinesAdded + analysis.metrics.totalLinesRemoved;
    const riskLevel = this.formatRiskLevel(analysis.metrics.riskLevel);
    let summary = `This change involves ${totalFiles} files with ${totalLines} total lines changed (${analysis.metrics.totalLinesAdded} added, ${analysis.metrics.totalLinesRemoved} removed).

`;
    summary += `Overall impact:
`;
    summary += `\u2022 Performance: ${this.formatScore(analysis.overallImpact.performance.score)}
`;
    summary += `\u2022 Security: ${this.formatScore(analysis.overallImpact.security.score)}
`;
    summary += `\u2022 Maintainability: ${this.formatScore(analysis.overallImpact.maintainability.score)}
`;
    summary += `\u2022 Risk level: ${riskLevel}

`;
    summary += `Key patterns detected: ${analysis.patterns.map((p) => p.type).join(", ")}

`;
    if (analysis.recommendations.length > 0) {
      summary += `Recommendations:
${analysis.recommendations.map((r) => `\u2022 ${r}`).join("\n")}
`;
    }
    return summary;
  }
  generateTechnicalDetails(analysis) {
    const files = analysis.fileChanges.map((file) => ({
      path: file.filePath,
      changes: file.changes,
      additions: file.complexity.lines.added,
      deletions: file.complexity.lines.removed
    }));
    const improvements = [
      `Improved maintainability with ${analysis.metrics.totalLinesAdded} lines of new code`,
      `Reduced technical debt by removing ${analysis.metrics.totalLinesRemoved} lines`,
      `Enhanced code quality across ${analysis.fileChanges.length} files`
    ];
    const concerns = [];
    if (analysis.overallImpact.performance.score < 7) {
      concerns.push("Performance changes may require additional testing");
    }
    if (analysis.overallImpact.security.score < 7) {
      concerns.push("Security changes need thorough review");
    }
    if (analysis.metrics.estimatedHours > 8) {
      concerns.push("Large changes may need staged deployment");
    }
    return {
      files,
      metrics: {
        ...analysis.metrics,
        averagePerformance: analysis.overallImpact.performance.score,
        averageSecurity: analysis.overallImpact.security.score,
        averageMaintainability: analysis.overallImpact.maintainability.score
      },
      improvements,
      concerns
    };
  }
  generateReviewNotes(analysis) {
    const notes = [];
    notes.push("Review code for consistency with project standards");
    notes.push("Check for any performance regressions");
    notes.push("Verify security implications of changes");
    analysis.fileChanges.forEach((file) => {
      if (file.complexity.cyclomatic > 5) {
        notes.push(`Pay special attention to ${file.filePath} - high cyclomatic complexity`);
      }
      if (file.impact.performance.concerns.length > 0) {
        notes.push(`${file.filePath} has performance concerns: ${file.impact.performance.concerns.join(", ")}`);
      }
      if (file.impact.security.concerns.length > 0) {
        notes.push(`${file.filePath} has security concerns: ${file.impact.security.concerns.join(", ")}`);
      }
    });
    if (analysis.patterns.some((p) => p.type === "major-feature")) {
      notes.push("Major feature changes require comprehensive testing");
    }
    if (analysis.patterns.some((p) => p.type === "cleanup-campaign")) {
      notes.push("Cleanup changes need verification that no functionality is lost");
    }
    return [...new Set(notes)];
  }
  generateBreakingChanges(analysis) {
    const breaking = [];
    analysis.fileChanges.forEach((file) => {
      if (file.impact.breaking) {
        breaking.push(`Breaking changes in ${file.filePath}`);
      }
      if (file.impact.risks.length > 0) {
        breaking.push(`Risks in ${file.filePath}: ${file.impact.risks.join(", ")}`);
      }
    });
    analysis.overallImpact.risks.forEach((risk) => {
      breaking.push(`Global risk: ${risk}`);
    });
    return breaking;
  }
  generateTestingNotes(analysis) {
    const notes = [];
    const estimatedHours = analysis.metrics.estimatedHours;
    notes.push(`Estimated testing effort: ${estimatedHours} hours`);
    if (estimatedHours > 8) {
      notes.push("Large changes - consider phased testing approach");
    }
    const totalAdded = analysis.metrics.totalLinesAdded;
    if (totalAdded > 500) {
      notes.push("Extensive changes required - comprehensive unit and integration tests needed");
    }
    if (analysis.overallImpact.performance.score < 7) {
      notes.push("Performance testing required - baseline metrics needed");
    }
    if (analysis.overallImpact.security.score < 8) {
      notes.push("Security testing required - penetration testing recommended");
    }
    if (analysis.patterns.some((p) => p.type === "refactor")) {
      notes.push("Refactoring changes - verify existing functionality preserved");
    }
    if (analysis.patterns.some((p) => p.type === "major-feature")) {
      notes.push("New feature - require user acceptance testing");
    }
    return notes;
  }
  formatScore(score) {
    if (score >= 9) return "Excellent \u2B50\u2B50\u2B50\u2B50\u2B50";
    if (score >= 8) return "Very Good \u2B50\u2B50\u2B50\u2B50";
    if (score >= 7) return "Good \u2B50\u2B50\u2B50";
    if (score >= 6) return "Fair \u2B50\u2B50";
    return "Needs Improvement \u2B50";
  }
  formatRiskLevel(level) {
    switch (level) {
      case "high":
        return "\u{1F534} High";
      case "medium":
        return "\u{1F7E1} Medium";
      case "low":
        return "\u{1F7E2} Low";
      default:
        return "Unknown";
    }
  }
};

// src/index.ts
var DiffExplainer = class {
  aiProvider;
  parser;
  analyzer;
  prGenerator;
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.aiProvider = new OpenAIProvider(apiKey);
    this.parser = new DiffParser();
    this.analyzer = new CodeAnalyzer(this.aiProvider);
    this.prGenerator = new PRGenerator();
  }
  /**
   * Analyze code changes and return detailed analysis
   */
  async explainChanges(options) {
    const { diff, commitHash, context, format = "summary" } = options;
    let diffText;
    if (diff) {
      diffText = diff;
    } else if (commitHash) {
      diffText = this.getCommitDiff(commitHash);
    } else {
      diffText = this.getStagedDiff();
    }
    if (!diffText || diffText.trim() === "") {
      throw new Error("No changes found to analyze");
    }
    const files = this.parser.parse(diffText);
    const analysis = await this.analyzer.analyze(files, context || "Code changes");
    switch (format) {
      case "pr":
        return this.prGenerator.generate(analysis);
      case "full":
        return analysis;
      case "summary":
      default:
        return {
          summary: analysis.summary,
          files: files.length,
          metrics: analysis.metrics,
          overallImpact: analysis.overallImpact
        };
    }
  }
  /**
   * Parse a diff and return structured file information
   */
  parseDiff(diffText) {
    return this.parser.parse(diffText);
  }
  /**
   * Generate a sample diff for testing
   */
  generateSampleDiff() {
    return this.parser.generateSampleDiff();
  }
  /**
   * Get staged changes from git
   */
  getStagedDiff() {
    const { execSync } = __require("child_process");
    try {
      return execSync("git diff --cached", { encoding: "utf8" });
    } catch (error) {
      throw new Error("Failed to get staged changes. Make sure you have staged changes using git add.");
    }
  }
  /**
   * Get diff from a specific commit
   */
  getCommitDiff(commitHash) {
    const { execSync } = __require("child_process");
    try {
      return execSync(`git show ${commitHash} --stat --cc`, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Failed to get diff for commit ${commitHash}`);
    }
  }
};
var index_default = DiffExplainer;

exports.CodeAnalyzer = CodeAnalyzer;
exports.DiffExplainer = DiffExplainer;
exports.DiffParser = DiffParser;
exports.OpenAIProvider = OpenAIProvider;
exports.PRGenerator = PRGenerator;
exports.default = index_default;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map