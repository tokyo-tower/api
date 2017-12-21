/**
 * 予約ルーター
 * @namespace routes.reservations
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

export default reservationRouter;
