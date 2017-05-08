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
exports.default = (requiredScopes) => {
    return (req, res, next) => {
        debug('required scopes:', requiredScopes);
        debug('req.user.scopes:', req.user.scopes);
        // スコープチェック
        debug('checking scopes requirements');
        const satisfied = requiredScopes.every((requiredScope) => req.user.scopes.indexOf(requiredScope) >= 0);
        if (!satisfied) {
            res.status(http_status_1.BAD_REQUEST);
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
