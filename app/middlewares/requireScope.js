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
        debug('req.user.scope:', req.user.scope);
        // スコープチェック
        debug('checking scope requirements...', permittedScopes);
        if (!Array.isArray(req.user.scope)) {
            next(new Error('invalid scope'));
        }
        const permittedUserScope = permittedScopes.find((permittedScope) => req.user.scope.indexOf(permittedScope) >= 0);
        if (permittedUserScope === undefined) {
            res.status(http_status_1.FORBIDDEN).end('Forbidden');
            return;
        }
        next();
    };
};
