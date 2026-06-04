// Test setup file for pkgcheck
// This runs before all tests and sets up the test environment

import { config } from "vitest/config";

// Configure vitest if needed
export default config({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
  },
});