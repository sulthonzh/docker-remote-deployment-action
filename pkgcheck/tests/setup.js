"use strict";
// Test setup file for pkgcheck
// This runs before all tests and sets up the test environment
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
// Configure vitest if needed
exports.default = (0, config_1.config)({
    test: {
        environment: "node",
        globals: true,
        setupFiles: [],
    },
});
//# sourceMappingURL=setup.js.map