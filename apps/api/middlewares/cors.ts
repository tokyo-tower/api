import express = require('express');

/**
 * CORS settings.
 * TODO 調整
 */
export default (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
};