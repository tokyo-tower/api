/**
 * oauthミドルウェア
 *
 * @module middlewares/authentication
 */

import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'express-jwt';

const debug = createDebug('ttts-api:middlewares:authentication');

export default [
    jwt(
        {
            secret: <string>process.env.TTTS_API_SECRET
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
