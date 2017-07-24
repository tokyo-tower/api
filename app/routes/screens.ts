/**
 * スクリーンルーター
 *
 * @module routes/screens
 */

import * as express from 'express';

const screenRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import * as ScreenController from '../controllers/screen';

screenRouter.use(authentication);

/**
 * スクリーンHTMLを取得する
 */
screenRouter.get(
    '/:id/show',
    permitScopes(['screens', 'screens.read-only']),
    (__1, __2, next) => {
        next();
    },
    validator,
    ScreenController.show
);

export default screenRouter;
