/**
 * スコープ必要条件ミドルウェア
 *
 * @ignore
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { FORBIDDEN } from 'http-status';

const debug = createDebug('chevre-api:middleware:authentication');

/**
 * スコープインターフェース
 */
type IScope = string;

export default (permittedScopes: IScope[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        debug('req.user.scope:', req.user.scope);

        // スコープチェック
        debug('checking scope requirements...', permittedScopes);
        if (!Array.isArray(req.user.scope)) {
            next(new Error('invalid scope'));
        }
        const permittedUserScope = permittedScopes.find((permittedScope: string) => req.user.scope.indexOf(permittedScope) >= 0);
        if (permittedUserScope === undefined) {
            res.status(FORBIDDEN).end('Forbidden');
            return;
        }

        next();
    };
};
