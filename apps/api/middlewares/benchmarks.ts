/**
 * ベンチマークミドルウェア
 *
 * @module benchmarksMiddleware
 */

import * as express from 'express';
import * as log4js from 'log4js';

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime();
        const logger = log4js.getLogger('system');

        req.on('end', () => {
            const endMemory = process.memoryUsage();
            const memoryUsage = endMemory.rss - startMemory.rss;
            const diff = process.hrtime(startTime);
            logger.debug(
                `${res.statusMessage} benchmark: took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`
            );
        });
    }

    next();
};
