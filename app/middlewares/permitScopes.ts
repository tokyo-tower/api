/**
 * スコープ許可ミドルウェア
 *
 * @module middlewares/permitScopes
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { FORBIDDEN } from 'http-status';

const debug = createDebug('ttts-api:middlewares:permitScopes');

/**
 * スコープインターフェース
 */
type IScope = string;

export default (permittedScopes: IScope[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        debug('req.user.scopes:', req.user.scopes);

        // スコープチェック
        try {
            debug('checking scope requirements...', permittedScopes);
            if (!isScopesPermitted(req.user.scopes, permittedScopes)) {
                res.status(FORBIDDEN).end('Forbidden');
            } else {
                next();
            }
        } catch (error) {
            next(error);
        }
    };
};

/**
 * 所有スコープが許可されたスコープかどうか
 *
 * @param {string[]} ownedScopes 所有スコープリスト
 * @param {string[]} permittedScopes 許可スコープリスト
 * @returns {boolean}
 */
export function isScopesPermitted(ownedScopes: string[], permittedScopes: string[]) {
    debug('checking scope requirements...', permittedScopes);
    if (!Array.isArray(ownedScopes)) {
        throw new Error('ownedScopes should be array of string');
    }

    const permittedOwnedScope = permittedScopes.find((permittedScope) => ownedScopes.indexOf(permittedScope) >= 0);

    return (permittedOwnedScope !== undefined);
}
