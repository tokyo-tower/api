import express = require('express');
import log4js = require('log4js');

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'dev') {
        let startMemory = process.memoryUsage();
        let startTime = process.hrtime();
        let logger = log4js.getLogger('system');

        req.on('end', () => {
            let endMemory = process.memoryUsage();
            let memoryUsage = endMemory.rss - startMemory.rss;
            let diff = process.hrtime(startTime);
            logger.debug(
                `${res.statusMessage} benchmark: took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`
            );
        });
    }

    next();
};