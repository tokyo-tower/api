/**
 * oauthルーター
 * @namespace routes.oauth
 */

import * as ttts from '@motionpicture/ttts-domain';
import { Router } from 'express';

import validator from '../middlewares/validator';

const oauthRouter = Router();

oauthRouter.post(
    '/token',
    (req, __, next) => {
        req.checkBody('username', 'invalid username').notEmpty().withMessage('username is required');
        req.checkBody('password', 'invalid password').notEmpty().withMessage('password is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const credentials = await ttts.service.admin.login(
                <string>process.env.AWS_ACCESS_KEY_ID,
                <string>process.env.AWS_SECRET_ACCESS_KEY,
                <string>process.env.ADMINS_USER_POOL_CLIENT_ID,
                <string>process.env.ADMINS_USER_POOL_CLIENT_SECRET,
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
