/**
 * oauthミドルウェア
 *
 * todo 認証失敗時の親切なメッセージ
 * todo scopeを扱う
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'express-jwt';

const debug = createDebug('chevre-api:middleware:authentication');

export default [
    jwt(
        {
            secret: process.env.CHEVRE_API_SECRET
            // todo チェック項目を増強する
            // audience: 'http://myapi/protected',
            // issuer: 'http://issuer'
        }
    ),
    (req: Request, __: Response, next: NextFunction) => {
        debug('req.user:', req.user);

        next();
    }
];
