/**
 * 予約ルーター
 *
 * @module routes/reservations
 */

import * as express from 'express';

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

export default reservationRouter;
