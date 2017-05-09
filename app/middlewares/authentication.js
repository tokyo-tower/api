"use strict";
/**
 * oauthミドルウェア
 *
 * todo 認証失敗時の親切なメッセージ
 * todo scopeを扱う
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const jwt = require("express-jwt");
const debug = createDebug('ttts-api:middleware:authentication');
exports.default = [
    jwt({
        secret: process.env.TTTS_API_SECRET
        // todo チェック項目を増強する
        // audience: 'http://myapi/protected',
        // issuer: 'http://issuer'
    }),
    (req, __, next) => {
        debug('req.user:', req.user);
        next();
    }
];
