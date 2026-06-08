"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
class Reporter {
    /**
     * Format a churn report as a human-readable table
     */
    formatReport(report) {
        const lines = [];
        lines.push(`codechurn report — ${report.repo} (${report.branch})`);
        lines.push(`period: ${report.since} → ${report.until}`);
        lines.push('');
        // Overview
        lines.push('overview');
        lines.push(`  commits analyzed: ${report.totalCommits}`);
        lines.push(`  AI commits:       ${report.aiCommits} (${this.pct(report.aiCommits, report.totalCommits)})`);
        lines.push(`  Human commits:    ${report.humanCommits} (${this.pct(report.humanCommits, report.totalCommits)})`);
        lines.push('');
        // Summary
        const s = report.summary;
        lines.push('survival rates');
        lines.push(`  AI lines:    ${s.aiLines} — ${this.fmt(s.aiSurvivalRate)} survived (${this.fmt(s.aiChurnRate)} churn)`);
        lines.push(`  Human lines: ${s.humanLines} — ${this.fmt(s.humanSurvivalRate)} survived (${this.fmt(s.humanChurnRate)} churn)`);
        lines.push('');
        // Revert rates
        lines.push('revert rates');
        lines.push(`  AI:    ${this.fmt(s.revertRate.ai)} of AI commits were reverts`);
        lines.push(`  Human: ${this.fmt(s.revertRate.human)} of human commits were reverts`);
        lines.push('');
        // Avg lifetime
        if (s.avgLifetime.ai > 0 || s.avgLifetime.human > 0) {
            lines.push('avg code lifetime');
            lines.push(`  AI:    ${s.avgLifetime.ai} days`);
            lines.push(`  Human: ${s.avgLifetime.human} days`);
            lines.push('');
        }
        // Model breakdown
        if (report.modelBreakdown) {
            lines.push('model breakdown');
            for (const [model, data] of Object.entries(report.modelBreakdown)) {
                lines.push(`  ${model}: ${data.commits} commits, ${data.lines} lines, ${this.fmt(data.survivalRate)} survival`);
            }
            lines.push('');
        }
        // Hotspots
        if (s.hotspots.length > 0) {
            lines.push(`⚠ ${s.hotspots.length} hotspot${s.hotspots.length > 1 ? 's' : ''} (high AI churn)`);
            for (const f of s.hotspots.slice(0, 10)) {
                lines.push(`  ${f}`);
            }
            lines.push('');
        }
        // File table
        if (report.files.length > 0) {
            lines.push('file details');
            lines.push(this.padR('file', 40) + this.padL('AI lines', 10) + this.padL('survival', 10) + this.padL('churn', 8) + this.padL('H survival', 12));
            lines.push('─'.repeat(80));
            for (const f of report.files.slice(0, 20)) {
                const name = f.file.length > 38 ? '…' + f.file.slice(-37) : f.file;
                lines.push(this.padR(name, 40) +
                    this.padL(String(f.aiLines), 10) +
                    this.padL(this.fmt(f.aiSurvivalRate), 10) +
                    this.padL(this.fmt(f.aiChurnRate), 8) +
                    this.padL(this.fmt(f.humanSurvivalRate), 12));
            }
            if (report.files.length > 20) {
                lines.push(`  ... and ${report.files.length - 20} more files`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Format as JSON
     */
    formatJSON(report) {
        return JSON.stringify(report, null, 2);
    }
    /**
     * Format as markdown
     */
    formatMarkdown(report) {
        const lines = [];
        const s = report.summary;
        lines.push(`# codechurn report — ${report.repo}`);
        lines.push('');
        lines.push(`**Branch:** ${report.branch} | **Period:** ${report.since} → ${report.until}`);
        lines.push('');
        lines.push('| Metric | AI | Human |');
        lines.push('|--------|-----|-------|');
        lines.push('| Commits | ' + report.aiCommits + ' | ' + report.humanCommits + ' |');
        lines.push('| Lines | ' + s.aiLines + ' | ' + s.humanLines + ' |');
        lines.push('| Survival Rate | ' + this.fmt(s.aiSurvivalRate) + ' | ' + this.fmt(s.humanSurvivalRate) + ' |');
        lines.push('| Churn Rate | ' + this.fmt(s.aiChurnRate) + ' | ' + this.fmt(s.humanChurnRate) + ' |');
        lines.push('| Revert Rate | ' + this.fmt(s.revertRate.ai) + ' | ' + this.fmt(s.revertRate.human) + ' |');
        lines.push('| Avg Lifetime | ' + s.avgLifetime.ai + 'd | ' + s.avgLifetime.human + 'd |');
        lines.push('');
        if (report.modelBreakdown) {
            lines.push('## Model Breakdown');
            lines.push('');
            lines.push('| Model | Commits | Lines | Survival | Churn |');
            lines.push('|-------|---------|-------|----------|-------|');
            for (const [model, data] of Object.entries(report.modelBreakdown)) {
                lines.push(`| ${model} | ${data.commits} | ${data.lines} | ${this.fmt(data.survivalRate)} | ${this.fmt(data.churnRate)} |`);
            }
            lines.push('');
        }
        if (s.hotspots.length > 0) {
            lines.push('## 🔥 Hotspots (High AI Churn)');
            lines.push('');
            for (const f of s.hotspots) {
                lines.push(`- \`${f}\``);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    pct(part, total) {
        if (total === 0)
            return '0%';
        return ((part / total) * 100).toFixed(1) + '%';
    }
    fmt(n) {
        return (n * 100).toFixed(1) + '%';
    }
    padR(s, len) {
        return s.length >= len ? s : s + ' '.repeat(len - s.length);
    }
    padL(s, len) {
        return s.length >= len ? s : ' '.repeat(len - s.length) + s;
    }
}
exports.Reporter = Reporter;
//# sourceMappingURL=reporter.js.map