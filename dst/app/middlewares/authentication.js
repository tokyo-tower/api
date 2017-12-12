"use strict";
/**
 * oauthミドルウェア
 *
 * @module middlewares/authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const jwt = require("express-jwt");
const debug = createDebug('ttts-api:middlewares:authentication');
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
