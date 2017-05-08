/**
 * スコープ必要条件ミドルウェア
 *
 * @ignore
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST } from 'http-status';

const debug = createDebug('chevre-api:middleware:authentication');

/**
 * スコープインターフェース
 */
type IScope = string;

export default (requiredScopes: IScope[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        debug('required scopes:', requiredScopes);
        debug('req.user.scopes:', req.user.scopes);

        // スコープチェック
        debug('checking scopes requirements');
        const satisfied = requiredScopes.every((requiredScope) => req.user.scopes.indexOf(requiredScope) >= 0);
        if (!satisfied) {
            res.status(BAD_REQUEST);
            res.json({
                errors: [
                    {
                        source: { parameter: 'scopes' },
                        title: 'invalid scopes',
                        detail: 'required scopes not satisfied'
                    }
                ]
            });
            return;
        }

        next();
    };
};
