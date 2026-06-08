"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = exports.GitAnalyzer = exports.ChurnAnalyzer = void 0;
var churn_analyzer_1 = require("./churn-analyzer");
Object.defineProperty(exports, "ChurnAnalyzer", { enumerable: true, get: function () { return churn_analyzer_1.ChurnAnalyzer; } });
var git_analyzer_1 = require("./git-analyzer");
Object.defineProperty(exports, "GitAnalyzer", { enumerable: true, get: function () { return git_analyzer_1.GitAnalyzer; } });
var reporter_1 = require("./reporter");
Object.defineProperty(exports, "Reporter", { enumerable: true, get: function () { return reporter_1.Reporter; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map