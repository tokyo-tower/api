/**
 * 管理者ルーター
 * @namespace routes.admins
 */

import * as ttts from '@tokyotower/domain';
import { Router } from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const adminsRouter = Router();
adminsRouter.use(authentication);

/**
 * ログイン中の管理者ユーザー情報を取得する
 */
adminsRouter.get(
    '/me',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            const admin = await ttts.service.admin.getUserByAccessToken(req.accessToken)();

            res.json(admin);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ログイン中の管理者ユーザーのグループリストを取得する
 */
adminsRouter.get(
    '/me/groups',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            const admin = await ttts.service.admin.getGroupsByUsername(
                <string>process.env.AWS_ACCESS_KEY_ID,
                <string>process.env.AWS_SECRET_ACCESS_KEY,
                <string>process.env.ADMINS_USER_POOL_ID,
                <string>req.user.username
            )();

            res.json(admin);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 管理者リストを取得する
 */
adminsRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin']),
    validator,
    async (req, res, next) => {
        try {
            let admins: ttts.service.admin.IAdmin[];
            if (typeof req.query.group === 'string') {
                admins = await ttts.service.admin.findAllByGroup(
                    <string>process.env.AWS_ACCESS_KEY_ID,
                    <string>process.env.AWS_SECRET_ACCESS_KEY,
                    <string>process.env.ADMINS_USER_POOL_ID,
                    req.query.group
                )();
            } else {
                admins = await ttts.service.admin.findAll(
                    <string>process.env.AWS_ACCESS_KEY_ID,
                    <string>process.env.AWS_SECRET_ACCESS_KEY,
                    <string>process.env.ADMINS_USER_POOL_ID
                )();
            }

            res.json(admins);
        } catch (error) {
            next(error);
        }
    }
);

export default adminsRouter;
