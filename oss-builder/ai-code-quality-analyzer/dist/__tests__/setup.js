"use strict";
// Jest setup file for AI Code Quality Analyzer tests
// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
// Mock file system operations for testing
jest.mock('fs-extra');
jest.mock('glob');
// Set up test environment variables
process.env.NODE_ENV = 'test';
// Increase timeout for complex operations
jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map