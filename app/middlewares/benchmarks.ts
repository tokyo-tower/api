/**
 * ベンチマークミドルウェア
 *
 * @module benchmarksMiddleware
 */

import * as createDebug from 'debug';
import * as express from 'express';

const debug = createDebug('ttts-api:middleware:benchmarks');

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime();

        req.on('end', () => {
            const endMemory = process.memoryUsage();
            const memoryUsage = endMemory.rss - startMemory.rss;
            const diff = process.hrtime(startTime);
            debug(
                '%s benchmark: took %s seconds and %s nanoseconds. memoryUsage:%s (%s - %s)',
                res.statusCode, diff[0], diff[1], memoryUsage, startMemory.rss, endMemory.rss
            );
        });
    }

    next();
};
