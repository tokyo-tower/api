/**
 * 予約ルーター
 * @namespace routes.reservations
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';

const reservationsRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

reservationsRouter.use(authentication);

/**
 * 入場
 */
reservationsRouter.post(
    '/:id/checkins',
    permitScopes(['reservations.checkins']),
    (req, _, next) => {
        req.checkBody('when', 'invalid when').notEmpty().withMessage('when is required').isISO8601();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: moment(req.body.when).toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };

            const reservation = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                {
                    $push: { checkins: checkin }
                }
            ).exec();

            if (reservation === null) {
                throw new ttts.factory.errors.NotFound('reservations');
            }

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場取消
 * 入場日時がid
 */
reservationsRouter.delete(
    '/:id/checkins/:when',
    permitScopes(['reservations.checkins']),
    validator,
    async (req, res, next) => {
        try {
            const reservation = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                {
                    $pull: { checkins: { when: req.params.when } }
                },
                { new: true }
            ).exec();

            if (reservation === null) {
                throw new ttts.factory.errors.NotFound('reservations');
            }

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;
