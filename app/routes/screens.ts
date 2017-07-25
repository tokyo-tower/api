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
            await ScreenController.getHtml(req.params.id).then((option) => {
                option.match({
                    Some: (html) => {
                        res.status(httpStatus.OK).json({
                            data: html
                        });
                    },
                    None: () => {
                        res.status(httpStatus.NOT_FOUND).json({
                            data: null
                        });
                    }
                });
            });
        } catch (error) {
            next(error);
        }
    }
);

export default screenRouter;
