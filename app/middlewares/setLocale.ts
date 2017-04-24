/**
 * 言語設定ミドルウェア
 *
 * @module setLocaleMiddleware
 */

import * as express from 'express';

// tslint:disable-next-line:variable-name
export default (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // todo URLパラメータで言語管理
    if (req.params.locale !== undefined) {
        req.setLocale(req.params.locale);
    }

    next();
};
