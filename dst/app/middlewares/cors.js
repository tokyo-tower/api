"use strict";
/**
 * CORSミドルウェア
 *
 * @module corsMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * CORS settings.
 * todo 調整
 */
// tslint:disable-next-line:variable-name
exports.default = (_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
};
