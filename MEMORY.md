# 🧠 MEMORY.md - Long-Term Memory

## Workspace Overview
This is an open source lab containing multiple projects and tools focused on AI/ML development, CI/CD, and software engineering utilities. The workspace includes both TypeScript/JavaScript projects and some experimental Zig projects.

## Active Projects Status
- **Main Project** (agent-sandbox-probe): Completed major restructuring with deletion of legacy probe system files
- **Agent Cost Observatory**: Active v1.1.0 development - TypeScript compilation errors blocking test progress
- **MCP Audit**: Healthy, tests passing (2/2)
- **OSS Builder**: Excellent progress, cycle 111 in progress on envguard project
- **Portfolio Growth**: 35+ directories with active development across multiple projects

## Critical Issues (2026-06-25)
### CI Health Crisis - 33% Success Rate
1. **Rollup Module Dependency**: npm-outdated-check completely failing due to missing @rollup/rollup-darwin-x64 module
2. **Probe System Legacy**: docker-remote-deployment-action and logchef-zig failing due to probe system removal
3. **TypeScript Compilation**: Agent-cost-observatory tests failing with multiple type errors

### Systemic Issues
- **Node Version Incompatibility**: npm v11.12.1 doesn't support Node.js v20.5.1 across multiple projects
- **Integration Backlog**: 25+ untracked directories requiring integration vs cleanup decisions

## Recent Progress
### OSS Builder Success
- Cycle 111 in progress on envguard project
- Consistent cycle completion rate maintained
- Previous cycles completed: 104-105 (pkgsize, gitpanic, shellstats)

### Portfolio Health Assessment
- **Passing Projects**: mcp-audit (2/2), git-conflicts (15/15), envguard (72/72)
- **Failing Projects**: 4 critical failures blocking CI progress
- **Active Development**: Heavy ongoing development across multiple projects

## Architectural Changes
### Main Project Restructuring
- Significant deletion of legacy probe system files
- New architecture without probe dependencies
- Multiple dependent projects affected by removal

### Development Patterns
- Regular health checks systematically tracking portfolio health
- Build artifacts present and active (zig-cache, .openclaw/, node_modules)
- Strategic decisions needed for experimental projects

## Strategic Observations
- Portfolio expansion continues but needs strategic integration decisions
- CI health critically declining - requires immediate attention to failing projects
- Agent-cost-observatory showing maturation despite technical blockers
- Strong focus on OSS development workflows with consistent progress

## Resolution Status
- Probe runner issues: Need replacement system or test updates
- Rollup dependency: Needs npm reinstall or dependency update  
- TypeScript errors: Need interface/type fixes
- Integration backlog: Growing but manageable with prioritization

---

*Created: 2026-06-07*
*Last Updated: 2026-06-25*
*Based on comprehensive heartbeat checks and workspace assessment*