/**
 * 予約ルーター
 * @module routes/reservations
 */

import * as express from 'express';
import * as httpStatus from 'http-status';
import * as moment from 'moment';

const reservationRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import * as ReservationController from '../controllers/reservation';

reservationRouter.use(authentication);

/**
 * 入場
 */
reservationRouter.post(
    '/:id/checkins',
    permitScopes(['reservations', 'reservations.checkins']),
    validator,
    async (req, res, next) => {
        try {
            const checkin = {
                when: moment().toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };

            await ReservationController.createCheckin(req.params.id, checkin).then((result) => {
                if (result === null) {
                    res.status(httpStatus.NOT_FOUND).json({
                        data: null
                    });
                } else {
                    res.status(httpStatus.NO_CONTENT).end();
                }
            });
        } catch (error) {
            next(error);
        }
    }
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
