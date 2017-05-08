"use strict";
/**
 * スコープ必要条件ミドルウェア
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const http_status_1 = require("http-status");
const debug = createDebug('chevre-api:middleware:authentication');
exports.default = (permittedScopes) => {
    return (req, res, next) => {
        debug('req.user.scopes:', req.user.scopes);
        // スコープチェック
        debug('checking scopes requirements...', permittedScopes);
        const permittedUserScope = permittedScopes.find((permittedScope) => req.user.scopes.indexOf(permittedScope) >= 0);
        if (permittedUserScope === undefined) {
            res.status(http_status_1.FORBIDDEN).end('Forbidden');
            return;
        }
        next();
    };
};
