/**
 * oAuthルーター
 *
 * @ignore
 */

import * as createDebug from 'debug';
import * as express from 'express';

import * as OAuthController from '../controllers/oauth';
import validator from '../middlewares/validator';

const oAuthRouter = express.Router();
const debug = createDebug('ttts-api:routes:oauth');

oAuthRouter.post(
    '/token',
    (req, __2, next) => {
        req.checkBody('grant_type', 'invalid grant_type')
            .notEmpty().withMessage('assertion is required')
            .equals('client_credentials');
        req.checkBody('scopes', 'invalid scopes').notEmpty().withMessage('scopes is required');

        // 認可タイプによってチェック項目が異なる
        switch (req.body.grant_type) {
            case 'client_credentials':
                req.checkBody('client_id', 'invalid client_id').notEmpty().withMessage('client_id is required');
                req.checkBody('client_secret', 'invalid client_secret').notEmpty().withMessage('client_secret is required');
                req.checkBody('state', 'invalid state').notEmpty().withMessage('state is required');
                break;

            default:
        }

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // 資格情報を発行する
            debug('issueing credentials...');
            const credentials = await OAuthController.issueCredentials(req);
            res.json(credentials);
        } catch (error) {
            next(error);
        }
    });

export default oAuthRouter;
