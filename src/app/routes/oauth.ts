/**
 * oauthルーター
 * @namespace routes.oauth
 */

import * as ttts from '@tokyotower/domain';
import * as basicAuth from 'basic-auth';
import * as createDebug from 'debug';
import { Router } from 'express';

import validator from '../middlewares/validator';

const debug = createDebug('ttts-api:routes:oauth');
const oauthRouter = Router();

oauthRouter.post(
    '/token',
    (req, __, next) => {
        req.checkBody('username', 'invalid username')
            .notEmpty()
            .withMessage('username is required');
        req.checkBody('password', 'invalid password')
            .notEmpty()
            .withMessage('password is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // ベーシック認証ユーザーがクライアント情報
            const user = basicAuth(req);
            debug('basic auth user:', user);
            if (user === undefined) {
                throw new ttts.factory.errors.Unauthorized();
            }

            const credentials = await ttts.service.admin.login(
                <string>process.env.AWS_ACCESS_KEY_ID,
                <string>process.env.AWS_SECRET_ACCESS_KEY,
                user.name,
                user.pass,
                <string>process.env.ADMINS_USER_POOL_ID,
                req.body.username,
                req.body.password
            )();

            res.json(credentials);
        } catch (error) {
            next(error);
        }
    }
);

export default oauthRouter;
