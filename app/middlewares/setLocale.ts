/**
 * 言語設定ミドルウェア
 *
 * @module setLocaleMiddleware
 */

import * as createDebug from 'debug';
import * as express from 'express';

const debug = createDebug('chevre-api:middleware:setLocale');

// tslint:disable-next-line:variable-name
export default (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // todo URLパラメータで言語管理
    if (req.params.locale !== undefined) {
        debug('setting locale...', req.params.locale);
        req.setLocale(req.params.locale);
    }

    next();
};
