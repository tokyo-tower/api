/**
 * 予約ルーター
 *
 * @module routes/reservations
 */

import * as express from 'express';
import * as httpStatus from 'http-status';

const reservationRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import setLocale from '../middlewares/setLocale';
import validator from '../middlewares/validator';

import * as ReservationController from '../controllers/reservation';

reservationRouter.use(authentication);

/**
 * 予約メール転送
 */
reservationRouter.post(
    '/:id/transfer',
    permitScopes(['reservations', 'reservations.read-only']),
    setLocale,
    (req, __, next) => {
        // メールアドレスの有効性チェック
        req.checkBody('to', 'invalid to')
            .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));

        next();
    },
    validator,
    ReservationController.transfer
);

/**
 * 入場
 */
reservationRouter.post(
    '/:id/checkin',
    permitScopes(['reservations', 'reservations.checkins']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    ReservationController.checkin
);

/**
 * 予約取消
 */
reservationRouter.post(
    '/cancel',
    permitScopes(['reservations']),
    (req, __, next) => {
        req.checkBody('performance_day').notEmpty().withMessage('performance_day is required');
        req.checkBody('payment_no').notEmpty().withMessage('payment_no is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const canceledReservationIds = await ReservationController.cancel(req.body.performance_day, req.body.payment_no);

            if (canceledReservationIds.length > 0) {
                res.status(httpStatus.NO_CONTENT).end();
            } else {
                res.status(httpStatus.NOT_FOUND).json({
                    data: null
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export default reservationRouter;
