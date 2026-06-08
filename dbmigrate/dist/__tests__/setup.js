"use strict";
// Test setup file
// Clean up test artifacts before each test
beforeEach(() => {
    // Reset any global state
    if (globalThis.__dbmigrate_test_cleanup) {
        globalThis.__dbmigrate_test_cleanup();
    }
});
afterEach(() => {
    // Clean up after each test
    if (globalThis.__dbmigrate_test_cleanup) {
        globalThis.__dbmigrate_test_cleanup();
    }
});
//# sourceMappingURL=setup.js.map