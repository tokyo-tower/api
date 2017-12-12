/**
 * スクリーンルーター
 *
 * @module routes/screens
 */

import * as express from 'express';
import * as httpStatus from 'http-status';

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
    validator,
    async (req, res, next) => {
        try {
            await ScreenController.getHtml(req.params.id).then((html) => {
                if (html === null) {
                    res.status(httpStatus.NOT_FOUND).json({
                        data: null
                    });
                } else {
                    res.status(httpStatus.OK).json({
                        data: html
                    });
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

export default screenRouter;
