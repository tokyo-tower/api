"use strict";
/**
 * スコープ許可ミドルウェア
 *
 * @module middlewares/permitScopes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const http_status_1 = require("http-status");
const debug = createDebug('ttts-api:middlewares:permitScopes');
exports.default = (permittedScopes) => {
    return (req, res, next) => {
        debug('req.user.scopes:', req.user.scopes);
        // スコープチェック
        try {
            debug('checking scope requirements...', permittedScopes);
            if (!isScopesPermitted(req.user.scopes, permittedScopes)) {
                res.status(http_status_1.FORBIDDEN).end('Forbidden');
            }
            else {
                next();
            }
        }
        catch (error) {
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
function isScopesPermitted(ownedScopes, permittedScopes) {
    debug('checking scope requirements...', permittedScopes);
    if (!Array.isArray(ownedScopes)) {
        throw new Error('ownedScopes should be array of string');
    }
    const permittedOwnedScope = permittedScopes.find((permittedScope) => ownedScopes.indexOf(permittedScope) >= 0);
    return (permittedOwnedScope !== undefined);
}
exports.isScopesPermitted = isScopesPermitted;
