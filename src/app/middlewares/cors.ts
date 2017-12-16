/**
 * CORSミドルウェア
 *
 * @module corsMiddleware
 */

import * as express from 'express';

/**
 * CORS settings.
 * todo 調整
 */
// tslint:disable-next-line:variable-name
export default (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
};
