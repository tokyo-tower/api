/**
 * 予約ルーター
 * @namespace routes.reservations
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const debug = createDebug('ttts-api:routes:reservations');
const reservationsRouter = express.Router();

const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

reservationsRouter.use(authentication);

/**
 * 予約検索
 */
reservationsRouter.get(
    '',
    permitScopes(['reservations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // 予約検索条件
            const conditions: any[] = [];

            if (!_.isEmpty(req.query.status)) {
                conditions.push({ status: req.query.status });
            }
            if (!_.isEmpty(req.query.performanceId)) {
                conditions.push({ performance: req.query.performanceId });
            }
            if (!_.isEmpty(req.query.performanceStartFrom)) {
                conditions.push({ performance_start_date: { $gte: moment(req.query.performanceStartFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceStartThrough)) {
                conditions.push({ performance_start_date: { $lte: moment(req.query.performanceStartThrough).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndFrom)) {
                conditions.push({ performance_end_date: { $gte: moment(req.query.performanceEndFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndThrough)) {
                conditions.push({ performance_end_date: { $lte: moment(req.query.performanceEndThrough).toDate() } });
            }

            // 予約を検索
            debug('searching reservations...', conditions);
            const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                .exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));

            res.json(reservations);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場
 */
reservationsRouter.post(
    '/:id/checkins',
    permitScopes(['reservations.checkins']),
    (req, __, next) => {
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
