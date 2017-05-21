"use strict";
/**
 * ベンチマークミドルウェア
 *
 * @module benchmarksMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const debug = createDebug('ttts-api:middleware:benchmarks');
exports.default = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime();
        req.on('end', () => {
            const endMemory = process.memoryUsage();
            const memoryUsage = endMemory.rss - startMemory.rss;
            const diff = process.hrtime(startTime);
            debug('%s benchmark: took %s seconds and %s nanoseconds. memoryUsage:%s (%s - %s)', res.statusCode, diff[0], diff[1], memoryUsage, startMemory.rss, endMemory.rss);
        });
    }
    next();
};
